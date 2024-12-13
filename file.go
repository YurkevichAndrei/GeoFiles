package main

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

type File struct {
	path     string
	typeFile string
}

func uploadfileHttp2(w http.ResponseWriter, r *http.Request) {
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

	endTime := time.Now()
	duration := endTime.Sub(startTime)
	fmt.Fprintf(w, "Файлы скачаны за %s\n", duration.String())
	log.Printf("Файлы скачаны за %s", duration.String())

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

		savedFileName := filepath.Join(dir, "uploads", filename)

		if _, err := os.Stat(filepath.Clean(filepath.Join(dir, "uploads"))); err == nil {
			fmt.Println("Папка существует")
		} else if os.IsNotExist(err) {
			err = os.MkdirAll(filepath.Clean(filepath.Join(dir, "uploads")), 0755) // 0755 означает права доступа rwxr-xr-x
			if err != nil {
				log.Fatalf("Не удалось создать папки: %v", err)
			}
		}

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

		FileToPostgis(savedFileName)
		//TODO тут надо отправить сообщение в kafka для того, чтобы сделать очередь из файлов

		endTimeFile := time.Now()
		durationFile := endTimeFile.Sub(startTimeFile)

		fmt.Fprintf(w, "%s сохранен за %s\n", filename, durationFile.String())
		log.Printf("Файл %s сохранен за %s", filename, durationFile.String())
	}

}
