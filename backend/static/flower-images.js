const localFlowerImages = new Map([
    ["장미", "/static/flowers/01_rose.png"],
    ["라벤더", "/static/flowers/02_lavender.png"],
    ["해바라기", "/static/flowers/reference/03_sunflower.png"],
    ["국화", "/static/flowers/04_chrysanthemum.png"],
    ["튤립", "/static/flowers/05_tulip.png"],
    ["카네이션", "/static/flowers/06_carnations.png"],
    ["벚꽃", "/static/flowers/07_cherry blossoms.png"],
    ["수국", "/static/flowers/08_hydrangea.png"],
    ["안개꽃", "/static/flowers/09_gypsophila.png"],
    ["데이지", "/static/flowers/10_daisy.png"],
    ["작약", "/static/flowers/11_peony.png"],
    ["프리지아", "/static/flowers/12_freesia.png"]
]);

function getFlowerImageUrl(flower) {
    return flower.photo?.url || localFlowerImages.get(flower.name);
}
