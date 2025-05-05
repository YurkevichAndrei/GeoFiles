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

});