package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

//todo нужно получить сообщение из kafka и дальше его обработать

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

func FileToPostgis(filePath string) {
	const dbConnStr = "user=postgres password=12345678 dbname=geoapp sslmode=disable"

	filepathList := strings.Split(filepath.Base(filePath), ".")

	contentType := filepathList[len(filepathList)-1]

	if contentType == "tif" {
		dir, err := os.Getwd()
		if err != nil {
			log.Fatalln("Не удалось получить текущую директорию:", err)
		}

		filePath1x1 := filepath.Join(dir, fmt.Sprintf("%s_1x1.tif", filepathList[0]))

		cmd := exec.Command(
			"gdalwarp",
			"-tr", "1", "1",
			filePath,
			filePath1x1,
		)
		fmt.Println(cmd)

		err = cmd.Start()
		if err != nil {
			log.Fatalln("Не удалось выполнить GDAL Warp: ", err)
		}

		//TODO нужно будет добавть определение системы координат
		cmd = exec.Command(
			"raster2pgsql",
			//"-I",
			//"-C",
			//"-F",
			"-s",
			"32641",
			//"-R",
			filePath1x1,
			fmt.Sprintf("public.%s", filepathList[0]),
		)

		fmt.Println(cmd)

		// Получаем результат выполнения команды
		output, err := cmd.CombinedOutput()
		if err != nil {
			fmt.Println("Ошибка при выполнении команды:", err)
			return
		}
		outputStr := strings.SplitN(string(output), "\n", 2)[1]

		// Подключение к базе данных
		db, err := ConnectDB(dbConnStr)
		if err != nil {
			log.Fatalf("Ошибка подключения к базе данных: %v\n", err)
			return
		}

		_, err = db.Exec(outputStr)
		if err != nil {
			log.Fatalf("Ошибка выполнения запроса: %v\n%s", err, outputStr)
			return
		}

		fmt.Println("Изображение успешно сохранено в базу.")

	}
}
