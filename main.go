package main

import (
	"fmt"

	"log"
	"net/http"
)

func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "index.html")
	})

	http.HandleFunc("/upload", uploadfileHttp2)

	fmt.Println("Сервер запущен на 192.168.4.218:8000")
	log.Fatal(http.ListenAndServe("192.168.4.218:8000", nil))
}

//raster2pgsql -I -C -F -s 32641 C:\Users\user\file.tif public.file > output.sql

// TODO Надо сначала параллельно (из очереди) снизить разрешения растров и помещать их всех в папку с уникальным названием,
// TODO затем загрузить их все вместе в бд из папки.
// TODO Нужно подумать, что делать с остальными файлами.
