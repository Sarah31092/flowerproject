const detail = document.getElementById("flower-detail");
const flowerName = detail.dataset.flowerName;

const photos = {
    "장미": [
        "photo-1490750967868-88aa4486c946",
        "photo-1518895949257-7621c3c786d7",
        "photo-1494972308805-463bc619d34e",
        "photo-1455659817273-f96807779a8a",
        "photo-1496065187959-7f07b8353c55",
        "photo-1518709268805-4e9042af9f23"
    ],
    "라벤더": [
        "photo-1470252649378-9c29740c9fa8",
        "photo-1499002238440-d264edd596ec",
        "photo-1470252649378-9c29740c9fa8",
        "photo-1462275646964-a0e3386b89fa",
        "photo-1490750967868-88aa4486c946",
        "photo-1470509037663-253afd7f0f51"
    ],
    "해바라기": [
        "photo-1470509037663-253afd7f0f51",
        "photo-1500382017468-9049fed747ef",
        "photo-1597848212624-f1bf23d6f1c4",
        "photo-1470252649378-9c29740c9fa8",
        "photo-1490750967868-88aa4486c946",
        "photo-1508610048659-a06b669e3321"
    ],
    "국화": [
        "photo-1508610048659-a06b669e3321",
        "photo-1494972308805-463bc619d34e",
        "photo-1490750967868-88aa4486c946",
        "photo-1518895949257-7621c3c786d7",
        "photo-1520763185298-1b434c919102",
        "photo-1470509037663-253afd7f0f51"
    ],
    "튤립": [
        "photo-1520763185298-1b434c919102",
        "photo-1490750967868-88aa4486c946",
        "photo-1508610048659-a06b669e3321",
        "photo-1494972308805-463bc619d34e",
        "photo-1518895949257-7621c3c786d7",
        "photo-1470509037663-253afd7f0f51"
    ],
    "카네이션": [
        "photo-1494972308805-463bc619d34e",
        "photo-1490750967868-88aa4486c946",
        "photo-1518895949257-7621c3c786d7",
        "photo-1508610048659-a06b669e3321",
        "photo-1520763185298-1b434c919102",
        "photo-1470252649378-9c29740c9fa8"
    ],
    "벚꽃": [
        "photo-1522383225653-ed111181a951",
        "photo-1490750967868-88aa4486c946",
        "photo-1518895949257-7621c3c786d7",
        "photo-1470252649378-9c29740c9fa8",
        "photo-1508610048659-a06b669e3321",
        "photo-1520763185298-1b434c919102"
    ],
    "수국": [
        "photo-1508610048659-a06b669e3321",
        "photo-1490750967868-88aa4486c946",
        "photo-1518895949257-7621c3c786d7",
        "photo-1520763185298-1b434c919102",
        "photo-1494972308805-463bc619d34e",
        "photo-1470252649378-9c29740c9fa8"
    ]
};
const defaultPhotos = [
    "photo-1490750967868-88aa4486c946",
    "photo-1518895949257-7621c3c786d7",
    "photo-1470509037663-253afd7f0f51",
    "photo-1494972308805-463bc619d34e",
    "photo-1520763185298-1b434c919102",
    "photo-1470252649378-9c29740c9fa8"
];
const imageIds = photos[flowerName] || defaultPhotos;

imageIds.forEach((imageId, index) => {
    const image = document.getElementById(`flower-photo-${index + 1}`);
    if (image) {
        image.src = `https://images.unsplash.com/${imageId}?auto=format&fit=crop&w=1000&q=85`;
    }
});
