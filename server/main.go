package main

import (
	"fmt"
	"log"
	"net/http"
)

func main() {
	config()

	// загрузка файлов на сервер
	http.HandleFunc("/server/upload", uploadFile)

	// запрос списка файлов
	http.HandleFunc("/server/files", getListFiles)

	// скачивание файла клиентом с сервера
	http.HandleFunc("/server/download/", getFile)

	fmt.Println(fmt.Sprintf("Сервер запущен на %s:%s", Config.ServerConfig.Host, Config.ServerConfig.Port))
	log.Fatal(http.ListenAndServe(fmt.Sprintf("%s:%s", Config.ServerConfig.Host, Config.ServerConfig.Port),
		nil))
}
