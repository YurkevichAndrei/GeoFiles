package main

import (
	"fmt"
	"log"
	"net/http"
)

func main() {
	// загрузка файлов на сервер
	http.HandleFunc("/server/upload", uploadFile)

	// запрос списка файлов
	http.HandleFunc("/server/files", getListFiles)

	// скачивание файла клиентом с сервера
	http.HandleFunc("/server/download/", getFile)

	fmt.Println("Сервер запущен на 127.0.0.1:5000")
	log.Fatal(http.ListenAndServe("127.0.0.1:5000", nil))
}
