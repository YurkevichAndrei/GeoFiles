package main

import (
	"encoding/json"
	"fmt"
	"os"
)

type Server struct {
	Host string `json:"host"`
	Port string `json:"port"`
}

type Configuration struct {
	DirNameForFiles string      `json:"dir_name_for_files"`
	ServerConfig    Server      `json:"server"`
	DB              DataBase    `json:"database"`
	TypesFiles      []TypeFiles `json:"type_files"`
}

var Config Configuration

func config() {
	fileContent, err := os.ReadFile("./server/config.json")
	if err != nil {
		fmt.Println("Error reading file:", err)
		return
	}

	// Декодируем JSON в структуру
	err = json.Unmarshal(fileContent, &Config)
	if err != nil {
		fmt.Println("Error decoding JSON:", err)
		return
	}
}
