package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os/exec"
	"path/filepath"
	_ "pq"
	"strings"
)

const dbConnStr = "port=5433 user=postgres password=a6803884 dbname=geoapp sslmode=disable"

// ConnectDB соединение с БД
func ConnectDB(connectInfo string) (*sql.DB, error) {
	db, err := sql.Open("postgres", connectInfo)
	if err != nil {
		return nil, err
	}

	err = db.Ping()
	if err != nil {
		return nil, err
	}

	return db, nil
}

// FileToPostgis обработка файла и добавление в БД
func (file File) FileToPostgis() {
	filepathList := strings.Split(filepath.Base(file.Path), ".")

	if file.TypeFile == "tif" {
		dir, err := existOrNewPath(filepath.Dir(file.Path), "1x1")
		if err != nil {
			log.Fatalln("Не удалось получить директорию:", err)
		}

		filePath1x1 := filepath.Join(dir, fmt.Sprintf("%s_1x1.tif", filepathList[0]))

		cmd := exec.Command(
			"gdalwarp",
			"-tr", "100", "100",
			file.Path,
			filePath1x1,
		)
		fmt.Println(cmd)

		err = cmd.Start()
		if err != nil {
			log.Fatalln("Не удалось выполнить GDAL Warp: ", err)
		}

		err = cmd.Wait()
		if err != nil {
			log.Fatalln("Не удалось выполнить GDAL Warp: ", err)
		}

		cmd = exec.Command(
			"raster2pgsql",
			"-a", "-R", "-F",
			filePath1x1,
			"public.rasters",
		)

		fmt.Println(cmd)

		// Получаем результат выполнения команды
		output, err := cmd.CombinedOutput()
		if err != nil {
			fmt.Println("Ошибка при выполнении команды:", err)
			return
		}
		outputStr := strings.SplitN(strings.SplitN(string(output), "\n", 2)[1], "Processing", 2)[0]

		// Подключение к базе данных
		db, err := ConnectDB(dbConnStr)
		if err != nil {
			log.Fatalf("Ошибка подключения к базе данных: %v\n", err)
			return
		}

		// Получаем id проекта
		projectIdRequest := fmt.Sprintf("SELECT id FROM projects WHERE name = '%s'", file.Project)
		projectIdResponse, err := db.Query(projectIdRequest)
		if err != nil {
			log.Fatalf("Ошибка выполнения запроса: %s\n%v", projectIdRequest, err)
			return
		}
		defer projectIdResponse.Close()
		var projectId string
		projectIdResponse.Next()
		_ = projectIdResponse.Scan(&projectId)

		// Добавление данных для столбца path и project
		sqls := strings.Split(outputStr, ")")
		outputStr = fmt.Sprintf("%s, \"path\", \"project\")%s, '%s', %s)%s", sqls[0], sqls[1], file.Path, projectId, sqls[2])

		_, err = db.Exec(outputStr)
		if err != nil {
			log.Fatalf("Ошибка выполнения запроса: %s\n%v", outputStr, err)
			return
		}

		fmt.Println("Изображение успешно сохранено в базу.")

		fileToGeoserver(filePath1x1, filepathList[0])
	}
	if file.TypeFile == "kml" {
		epsg, err := getEpsgVector(file.Path)
		if err != nil {
			log.Fatalln(err)
		}

		dir, err := existOrNewPath(filepath.Dir(file.Path), "shp")
		if err != nil {
			log.Fatalln("Не удалось получить директорию:", err)
		}
		// преобразуем файл в формат shp
		cmd := exec.Command(
			"ogr2ogr",
			"-f", "ESRI Shapefile",
			"-select", "Name",
			dir,
			file.Path,
		)
		// ogr2ogr -f "postgres" PG:"port=5433 user=postgres password=a6803884 dbname=geoapp sslmode=disable" ./uploads/test.kml -lco GEOMETRY_NAME=geom -nln vectors -a_srs EPSG:4326
		// ogr2ogr -f "ESRI Shapefile" output test.kml
		// shp2pgsql ./output/test.shp public.vectors
		fmt.Println(cmd)

		err = cmd.Start()
		if err != nil {
			log.Fatalln("Не удалось выполнить преобразование в shp: ", err)
		}

		err = cmd.Wait()
		if err != nil {
			log.Fatalln("Не удалось выполнить преобразование в shp: ", err)
		}

		// получение имени файла
		fileNameWithoutExt := filepath.Base(file.Path[:len(file.Path)-len(filepath.Ext(file.Path))])
		filePathShp := filepath.Join(dir, fmt.Sprintf("%s.shp", fileNameWithoutExt))

		tableName := strings.Replace(filepath.Base(file.Path), ".", "__", -1)
		// загружаем в БД, как вектор
		cmd = exec.Command(
			"shp2pgsql",
			filePathShp,
			fmt.Sprintf("public.%s", tableName),
		)

		fmt.Println(cmd)

		// Получаем результат выполнения команды
		output, err := cmd.CombinedOutput()
		if err != nil {
			fmt.Println("Ошибка при выполнении команды:", err)
			return
		}

		outputStr := strings.SplitN(string(output), "\n", 3)[2]

		// Ищем позицию второго с конца символа новой строки
		lastIndexLine := 0
		for i := 0; i < 3; i++ {
			lastIndexLine = strings.LastIndexByte(outputStr, '\n')
			outputStr = outputStr[:lastIndexLine]
		}

		// Подключение к базе данных
		db, err := ConnectDB(dbConnStr)
		if err != nil {
			log.Fatalf("Ошибка подключения к базе данных: %v\n", err)
			return
		}

		_, err = db.Exec(outputStr)
		if err != nil {
			log.Fatalf("Ошибка выполнения запроса: %s\n%v", outputStr, err)
			return
		}
		// загружаем в БД запись о том, где размещен оригинал и как называется таблица с вектором
		newVector := fmt.Sprintf("INSERT INTO \"public\".\"vectors\" (\"filename\", \"tablename\", \"path\", \"project\", \"epsg\") VALUES('%s', '%s', '%s', '%s', %s)", filepath.Base(file.Path), tableName, file.Path, file.Project, epsg)

		_, err = db.Exec(newVector)
		if err != nil {
			log.Fatalf("Ошибка выполнения запроса: %s\n%v", newVector, err)
			return
		}

		fmt.Println("Векторные данные успешно сохранены в базу.")

		// добавление векторных данных на геосервер
		postgisToGeoserver(tableName, epsg)
	}
}

// запрос списка растров в БД
func getListFiles(w http.ResponseWriter, r *http.Request) {
	if r.Method == "GET" {
		log.Println("get list files")
		db, _ := ConnectDB(dbConnStr)

		defer db.Close()

		rows, err := db.Query("SELECT r.path, p.name FROM rasters as r, projects as p WHERE r.project = p.id")
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		defer rows.Close()

		var files []File
		for rows.Next() {
			var file File
			file.TypeFile = "raster"
			if err := rows.Scan(&file.Path, &file.Project); err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
			}
			file.Path = filepath.Base(file.Path)
			files = append(files, file)
		}

		if err := rows.Err(); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
		}

		rows, err = db.Query("SELECT v.filename, p.name FROM vectors as v, projects as p WHERE v.project = p.id")
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		defer rows.Close()

		for rows.Next() {
			var file File
			file.TypeFile = "vector"
			if err := rows.Scan(&file.Path, &file.Project); err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
			}
			files = append(files, file)
		}

		if err := rows.Err(); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
		}

		filenamesJson, err := json.Marshal(files)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
		}

		w.WriteHeader(http.StatusOK)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(filenamesJson))
	}
}

func getPathFile(name string) (string, error) {
	// TODO реализовать получение пути к файлу в зависимости от типа файла
	db, err := ConnectDB(dbConnStr)
	if err != nil {
		return "", err
	}
	defer db.Close()

	query := fmt.Sprintf("SELECT path FROM rasters WHERE filename = '%s_1x1.tif'", strings.TrimSuffix(name, filepath.Ext(name)))
	log.Println(query)
	rows, err := db.Query(query)
	if err != nil {
		return "", err
	}
	defer rows.Close()

	var path string
	rows.Next()
	_ = rows.Scan(&path)
	log.Println(path)
	return path, nil
}
