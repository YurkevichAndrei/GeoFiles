package main

import (
	"errors"
	"sync"
)

type QueueFile struct {
	files []File
	mtx   sync.Mutex
}

func NewFileQueue() *QueueFile {
	return &QueueFile{
		files: make([]File, 0),
	}
}

func (q *QueueFile) AddFile(file File) {
	q.mtx.Lock()
	defer q.mtx.Unlock()

	q.files = append(q.files, file)
}

func (q *QueueFile) PopFirstFile() (File, error) {
	q.mtx.Lock()
	defer q.mtx.Unlock()

	if len(q.files) == 0 {
		return File{}, errors.New("очередь пуста")
	}
	outputFile := q.files[0]
	q.files = q.files[1:]
	return outputFile, nil
}

func (q *QueueFile) Size() int {
	q.mtx.Lock()
	defer q.mtx.Unlock()

	return len(q.files)
}
