package main

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

type File struct {
	path     string
	typeFile string
	project  string
}

type typeFile struct {
	typeName  string
	extention string
}

// Функция скачивания файла на сервер
func uploadFile(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()

	log.Println("Разбор multipart/form-data")
	err := r.ParseMultipartForm(3221225472) // Максимальный размер памяти для формы - 4 ГБ (4294967296) 3ГБ (3221225472)
	if err != nil {
		log.Println("Ошибка разбора multipart/form-data:", err)
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintln(w, "Невозможно обработать запрос")
		return
	}

	// Устанавливаем статус-код до начала работы с файлами
	w.WriteHeader(http.StatusCreated)

	mf := r.MultipartForm
	files := mf.File["files"]
	projectName := mf.Value["project"][0]

	endTime := time.Now()
	duration := endTime.Sub(startTime)
	fmt.Fprintf(w, "Файлы скачаны за %s\n", duration.String())
	log.Printf("Файлы скачаны за %s", duration.String())

	queue := NewFileQueue()

	for _, fileHeader := range files {
		startTimeFile := time.Now()

		file, err := fileHeader.Open()
		if err != nil {
			log.Println("Не найден файл:", err)
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		defer file.Close()

		filename := fileHeader.Filename

		// Сохраняем файл на диск
		dir, err := os.Getwd()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			log.Fatalln("Не удалось получить текущую директорию:", err)
		}
		// TODO тут нужно вводить нужный путь в зависимости от того где запущена программа
		// dir := "C:/ProgramData/GeoServer/data/test"

		// проверка наличия и создание папки uploads
		dir, err = existOrNewPath(dir, "uploads")
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			log.Fatalln("Не удалось получить директорию:", err)
		}

		// проверка наличия и создание папки проекта
		dir, err = existOrNewPath(dir, projectName)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			log.Fatalln("Не удалось получить директорию:", err)
		}

		// если файл - изображение TIF
		if filepath.Ext(filename) == ".tif" {
			dir, err = existOrNewPath(dir, "rasters")
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				log.Fatalln("Не удалось получить директорию:", err)
			}
		} else
		// если файл - .....
		if filepath.Ext(filename) == ".kml" {
			dir, err = existOrNewPath(dir, "vectors")
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				log.Fatalln("Не удалось получить директорию:", err)
			}
		}

		savedFileName := filepath.Join(dir, filename)

		f, err := os.OpenFile(savedFileName, os.O_WRONLY|os.O_CREATE, 0644)
		if err != nil {
			fmt.Fprintf(w, "Не удалось создать файл: %v", err)
			os.Remove(savedFileName)
			http.Redirect(w, r, "/", http.StatusSeeOther)
			return
		}

		defer f.Close()

		_, err = io.Copy(f, file)
		if err != nil {
			w.Write([]byte("Не получилось записать файл"))
			http.NotFound(w, r)
			log.Printf("Не удалось скопировать файл: %s", err.Error())
			return
		}

		filepathList := strings.Split(filepath.Base(savedFileName), ".")
		contentType := filepathList[len(filepathList)-1]
		queue.AddFile(File{path: savedFileName, typeFile: contentType, project: projectName})

		endTimeFile := time.Now()
		durationFile := endTimeFile.Sub(startTimeFile)

		fmt.Fprintf(w, "%s сохранен за %s\n", filename, durationFile.String())
		log.Printf("Файл %s сохранен за %s", filename, durationFile.String())
	}

	// разбор очереди файлов в отдельном потоке
	go processingFileFromQueue(queue)
}

// разбор очереди файлов
func processingFileFromQueue(queue *QueueFile) {
	for queue.Size() > 0 {
		// каждый файл обрабатывается в отдельном потоке
		go func() {
			file, err := queue.PopFirstFile()
			if err != nil {
				return
			}
			file.FileToPostgis()

		}()
	}
}

// функция отправки файла клиенту
func getFile(w http.ResponseWriter, r *http.Request) {
	uri := r.RequestURI

	log.Println(uri)
	uri_ := strings.Split(uri, "/")
	name := uri_[len(uri_)-1]
	path, err := getPathFile(name)
	if err != nil {
		http.Error(w, "Не удалось найти файл", http.StatusInternalServerError)
		return
	}

	dir := filepath.Dir(path)
	filename := filepath.Base(path)

	file, err := http.Dir(dir).Open(filename)
	if err != nil {
		log.Fatalln(err.Error())
		http.Error(w, "Не удалось открыть файл", http.StatusInternalServerError)
		return
	}
	defer file.Close()

	fileinfo, _ := file.Stat()
	log.Println(fileinfo.Name(), fileinfo.Size())
	// Устанавливаем заголовок Content-Type
	w.Header().Set("Content-Type", "application/octet-stream")

	info, _ := file.Stat()
	modTime := info.ModTime()

	// Отправляем файл клиенту
	http.ServeContent(w, r, name, modTime, file)
}

// проверка наличия и создание папки
func existOrNewPath(path string, dir string) (string, error) {
	newPath := filepath.Clean(filepath.Join(path, dir))
	_, err := os.Stat(newPath)
	if err == nil {
		log.Printf("Папка %s существует", newPath)
	} else if os.IsNotExist(err) {
		err = os.MkdirAll(newPath, 0755) // 0755 означает права доступа rwxr-xr-x
		if err != nil {
			log.Fatalf("Не удалось создать папки %s: %v", newPath, err)
		}
	}
	return newPath, err
}

func getEpsgVector(pathFile string) (string, error) {
	cmd := exec.Command(
		"ogrinfo",
		"-so", "-al",
		pathFile,
	)

	output, err := cmd.CombinedOutput()

	if err != nil {
		return "", err
	}

	// Преобразуем вывод в строку
	outputStr := string(output)

	// Используем регулярное выражение для поиска значения ID
	re := regexp.MustCompile(`ID\["EPSG",(\d+)\]`)
	match := re.FindStringSubmatch(outputStr)

	// Если найдено значение ID, выводим его
	if len(match) > 1 {
		id := match[len(match)-1]
		return id, nil
	} else {
		re = regexp.MustCompile(`AUTHORITY\["EPSG",(\d+)\]`)
		match = re.FindStringSubmatch(outputStr)
		if len(match) > 1 {
			id := match[len(match)-1]
			return id, nil
		} else {
			return "", fmt.Errorf("Не удалось найти значение EPSG")
		}
	}
}

func getEpsgRaster(pathFile string) (string, error) {
	cmd := exec.Command(
		"gdalsrsinfo",
		"-o", "epsg",
		pathFile,
	)

	output, err := cmd.CombinedOutput()

	if err != nil {
		return "", err
	}

	re := regexp.MustCompile(`EPSG:(\d+)`)
	match := re.FindStringSubmatch(string(output))

	if len(match) > 1 {
		if match[0] == "-1" {
			return "", fmt.Errorf("Не удалось найти значение EPSG")
		}
		return match[0], nil
	}
	return "", fmt.Errorf("Не удалось найти значение EPSG")
}
