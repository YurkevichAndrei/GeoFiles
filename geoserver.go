package main

import (
	"bytes"
	"encoding/xml"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
)

// coverage структура для хранения данных coverage
type coverage struct {
	Name             string     `xml:"name"`
	NativeName       string     `xml:"nativeName"`
	SRS              string     `xml:"srs"`
	ProjectionPolicy string     `xml:"projectionPolicy"`
	Params           Parameters `xml:"parameters"`
}

type Parameters struct {
	En []Entry `xml:"entry"`
}

type Entry struct {
	String []string `xml:"string"`
}

// coverageStore структура для хранения информации о хранилище
type coverageStore struct {
	Name      string    `xml:"name"`
	Workspace workspace `xml:"workspace"`
	Type      string    `xml:"type"`
	Url       string    `xml:"url"`
	Enabled   bool      `xml:"enabled"`
}

type workspace struct {
	Name string `xml:"name"`
}

type featureType struct {
	Name             string `xml:"name"`
	NativeName       string `xml:"nativeName"`
	SRS              string `xml:"srs"`
	ProjectionPolicy string `xml:"projectionPolicy"`
}

func fileToGeoserver(pathFile string, nameFile string) {
	contentType := "application/xml"

	ws := workspace{
		Name: "geoapp",
	}

	store := coverageStore{
		Name:      nameFile,
		Workspace: ws,
		Type:      "GeoTIFF",
		Url:       fmt.Sprintf("file:%s", pathFile),
		Enabled:   true,
	}
	outputXml, err := xml.MarshalIndent(store, "", "  ")
	if err != nil {
		log.Fatalf("Ошибка маршалинга: %v\n", err)
	}
	fmt.Println(string(outputXml))
	endpointURL := "http://127.0.0.1:5151/geoserver/rest/workspaces/geoapp/coveragestores"
	sendRequest(outputXml, endpointURL, contentType)

	entry := []Entry{
		{
			[]string{
				"InputTransparentColor",
				"#000000",
			},
			// String:  "InputTransparentColor",
			// String1: "#000000",
		},
	}

	cv := coverage{
		Name:             nameFile,
		NativeName:       fmt.Sprintf("%s_1x1", nameFile),
		SRS:              "EPSG:32641",
		ProjectionPolicy: "FORCE_DECLARED",
		Params: Parameters{
			En: entry,
		},
	}

	// TODO для того, чтобы получить проекцию gdalsrsinfo -o epsg your_file.tif

	outputXml, err = xml.MarshalIndent(cv, "", "  ")
	if err != nil {
		log.Fatalf("Ошибка маршалинга: %v\n", err)
	}
	fmt.Println(string(outputXml))
	endpointURL = fmt.Sprintf("http://127.0.0.1:5151/geoserver/rest/workspaces/geoapp/coveragestores/%s/coverages", nameFile)
	sendRequest(outputXml, endpointURL, contentType)
}

func postgisToGeoserver(tableName string, epsg string) {
	feature := featureType{
		Name:             tableName,
		NativeName:       tableName,
		SRS:              fmt.Sprintf("EPSG:%s", epsg),
		ProjectionPolicy: "FORCE_DECLARED",
	}

	outputXml, err := xml.MarshalIndent(feature, "", "  ")
	if err != nil {
		log.Fatalf("Ошибка маршалинга: %v\n", err)
	}
	fmt.Println(string(outputXml))

	endpointURL := "http://127.0.0.1:5151/geoserver/rest/workspaces/geoapp/datastores/geoapp_postgis/featuretypes"
	contentType := "application/xml"
	sendRequest(outputXml, endpointURL, contentType)
}

func sendRequest(outputXml []byte, endpointURL string, contentType string) {

	// Добавляем заголовок XML
	xmlData := append([]byte(xml.Header), outputXml...)

	// Создание тела запроса из строки XML
	body := bytes.NewBuffer(xmlData)

	// Создание HTTP-клиента
	client := &http.Client{}

	// Создание нового POST-запроса
	req, err := http.NewRequest(http.MethodPost, endpointURL, body)
	if err != nil {
		fmt.Printf("Ошибка при создании запроса: %v\n", err)
		return
	}

	// Установка Content-Type заголовка
	req.Header.Set("Content-Type", contentType)

	// Установка заголовков авторизации (если требуется)
	req.SetBasicAuth("admin", "geoserver") // замените admin и geoserver на реальные логин и пароль

	// Отправка запроса
	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("Ошибка при отправке запроса: %v\n", err)
		return
	}
	defer resp.Body.Close()

	// Чтение ответа от сервера
	responseBody, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		fmt.Printf("Ошибка при чтении ответа: %v\n", err)
		return
	}

	// Вывод ответа на экран
	fmt.Printf("Ответ от сервера:\n%s\n", responseBody)
}
