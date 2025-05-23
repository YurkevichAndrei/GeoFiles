// const navbarHeight = document.querySelector('.navbar').offsetHeight;
// document.querySelector('.offcanvas').style.padding_top = `${navbarHeight}px`;

document.addEventListener('DOMContentLoaded', function () {


    // Инициализации карты

    // Базовый слой OSM
    let osmLayer = new ol.layer.Tile({
        source: new ol.source.OSM()
    });

    // Создание карты
    let map = new ol.Map({
        target: 'map',
        layers: [
            osmLayer
        ],
        view: new ol.View({
            center: ol.proj.fromLonLat([37.6173, 55.7558]), // Координаты центра карты (Москва)
            zoom: 12
        })
    });

    // Обработчик события отправки формы
    document.getElementById('uploadForm').addEventListener('submit', async (e) => {
        document.getElementById('result').innerText = "";

        e.preventDefault();

        const formData = new FormData(e.target);
        const response = await fetch('/server/upload', {
            method: 'POST',
            body: formData,
        });

        document.getElementById('result').innerText = await response.text();
    });

    // Функция для загрузки данных из БД
    document.getElementById('btnList').addEventListener('click', function () {
        fetch('/server/files')
            .then(response => response.json())
            .then(data => {
                // Получаем элемент списка
                let dataList = document.getElementById('data-list');
                // Очищаем текущий список
                dataList.innerHTML = '';

                // Проходимся по каждому элементу данных
                data.forEach(item => {
                    const li = document.createElement('li');
                    li.className = 'mb-2 file';

                    // Название элемента
                    const title = document.createElement('strong');
                    title.textContent = item.path || 'Без названия';
                    li.appendChild(title);

                    li.appendChild(document.createElement("br"));

                    const icon = document.createElement('img');
                    if (item.typeFile === 'raster')
                    {
                        icon.src = '../img/raster.png'; // Путь к иконке
                    }
                    else if (item.typeFile === 'vector')
                    {
                        icon.src = '../img/vector.png'; // Путь к иконке
                    }
                    icon.alt = 'Icon';
                    icon.style.width = '20px';
                    li.appendChild(icon);

                    // Кнопки "Показать" и "Скачать"
                    const showButton = document.createElement('button');
                    showButton.type = 'button';
                    showButton.className = 'btn btn-success ms-2';
                    let layers = map.getLayers();
                    let existLayer = false;
                    for (let i=0; i<layers.getLength(); i++)
                    {
                        let layerParams = layers.item(i).get('source').params_;
                        if (typeof layerParams !== "undefined")
                        {
                            let layerName = layerParams.LAYERS[0].split(':',2)[1];
                            if (item.path.replace(/\.[^/.]+$/, "") === layerName)//слой на карте присутствует
                            {
                                existLayer = true;
                                break;
                            }
                            else//слой на карте отсутствует
                            {
                                existLayer = false;
                            }
                        }
                    }
                    if (existLayer)
                    {
                        showButton.textContent = 'Скрыть';
                    }
                    else
                    {
                        showButton.textContent = 'Показать';
                    }

                    li.appendChild(showButton);
                    showButton.addEventListener('click', function (){
                        if (showButton.textContent === 'Показать') {
                            addWMSLayer(item.path.replace(/\.[^/.]+$/, ""));
                            showButton.textContent = 'Скрыть';
                        }
                        else {
                            removeWMSLayer(item.path.replace(/\.[^/.]+$/, ""));
                            showButton.textContent = 'Показать';
                        }

                    })

                    const downloadButton = document.createElement('button');
                    downloadButton.type = 'button';
                    downloadButton.className = 'btn btn-info ms-2';
                    downloadButton.textContent = 'Скачать';
                    downloadButton.onclick = () => downloadItem(item.path); // Функция для скачивания элемента
                    li.appendChild(downloadButton);

                    dataList.appendChild(li);
                });
            })
            .catch(error => console.error('Ошибка при загрузке данных:', error));
    });

    // Функция для скачивания элемента
    function downloadItem(id) {
        fetch(`server/download/${id}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.blob();
            })
            .then(blob => {
                // Создаем ссылку для скачивания файла
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `${id}.tif`; // Имя файла, под которым он сохранится у клиента
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            })
            .catch(error => {
                console.error('There has been a problem with your fetch operation:', error);
            });
    }

    function addWMSLayer(name) {
        let wmsSource = new ol.source.TileWMS({
            url: '/geoserver/geoapp/wms',
            // params: {'LAYERS': [`geoapp:${name}`], 'VERSION':'1.3.0', 'SRS': 'EPSG:32641', 'CRS': 'EPSG:32641', 'TILED': true, 'TRANSPARENT': true},
            params: {'LAYERS': [`geoapp:${name}`], 'VERSION':'1.3.0', 'TILED': true, 'TRANSPARENT': true},
            serverType: 'geoserver'
        });
        console.log(wmsSource);
        let layer = new ol.layer.Tile({
            source: wmsSource,
        });

        map.addLayer(layer);
    }

    function removeWMSLayer(name) {
        let layers = map.getLayers();
        for (let i = 0; i < layers.getLength(); i++) {
            let layerParams = layers.item(i).get('source').params_;
            if (typeof layerParams !== "undefined") {
                let layerName = layerParams.LAYERS[0].split(':', 2)[1];
                if (name === layerName)//слой на карте присутствует
                {
                    map.removeLayer(layers.item(i));
                    break;
                }
            }
        }
    }

    // Слой для полигонов
    const vectorLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: new ol.style.Style({
            fill: new ol.style.Fill({
                color: 'rgba(0, 0, 255, 0.2)'
            }),
            stroke: new ol.style.Stroke({
                color: 'blue',
                width: 2
            })
        })
    });
    map.addLayer(vectorLayer);

    let smartSearchButton = document.getElementById('smartSearchButton');

    smartSearchButton.addEventListener('click', () => searchLocation())

    // Функция поиска города и отрисовки полигона
    async function searchLocation() {
        const locationName = document.getElementById('smartSearchInput').value.trim();
        if (!locationName) return;

        const url = `https://nominatim.openstreetmap.org/search.php?q=${encodeURIComponent(locationName)}&polygon_geojson=1&format=json`;

        try {
            const response = await fetch(url, {
                headers: { "User-Agent": "GeoFiles/1.0" } // Требуется Nominatim
            });
            const data = await response.json();

            if (data.length === 0) {
                alert("Место не найдено!");
                return;
            }

            const place = data[0];
            if (!place.geojson) {
                alert("Полигон не найден, показываю точку");
                showPoint(place.lon, place.lat, locationName);
                return;
            }

            // Очищаем предыдущие данные
            vectorLayer.getSource().clear();

            // Преобразуем GeoJSON в формат OpenLayers
            const format = new ol.format.GeoJSON();
            const features = format.readFeatures(place.geojson, {
                dataProjection: 'EPSG:4326', // WGS84
                featureProjection: 'EPSG:3857' // Web Mercator
            });

            vectorLayer.getSource().addFeatures(features);
            map.getView().fit(vectorLayer.getSource().getExtent());

        } catch (error) {
            console.error("Ошибка запроса:", error);
            alert("Произошла ошибка при загрузке данных");
        }
    }

    // Функция для отображения точки, если полигона нет
    function showPoint(lon, lat, name) {
        vectorLayer.getSource().clear();
        const point = new ol.Feature({
            geometry: new ol.geom.Point(ol.proj.fromLonLat([parseFloat(lon), parseFloat(lat)]))
        });
        vectorLayer.getSource().addFeature(point);
        map.getView().setCenter(ol.proj.fromLonLat([parseFloat(lon), parseFloat(lat)]));
        map.getView().setZoom(12);
    }

});