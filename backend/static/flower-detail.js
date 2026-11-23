const detail = document.getElementById("flower-detail");
const flowerName = detail.dataset.flowerName;

const photos = {
    "장미": "/static/flowers/01_rose.png",
    "라벤더": "/static/flowers/02_lavender.png",
    "해바라기": "/static/flowers/03_sunflower.png",
    "국화": "/static/flowers/04_chrysanthemum.png",
    "튤립": "/static/flowers/05_tulip.png",
    "카네이션": "/static/flowers/06_carnations.png",
    "벚꽃": "/static/flowers/07_cherry blossoms.png",
    "수국": "/static/flowers/08_hydrangea.png",
    "안개꽃": "/static/flowers/09_gypsophila.png",
    "데이지": "/static/flowers/10_daisy.png",
    "작약": "/static/flowers/11_peony.png",
    "프리지아": "/static/flowers/12_freesia.png"
};
const defaultPhoto = "/static/flowers/01_rose.png";
const imageUrl = photos[flowerName] || defaultPhoto;

for (let index = 0; index < 6; index += 1) {
    const image = document.getElementById(`flower-photo-${index + 1}`);
    if (image) {
        image.src = imageUrl;
        image.onerror = () => {
            image.onerror = null;
            image.src = defaultPhoto;
        };
    }
}
