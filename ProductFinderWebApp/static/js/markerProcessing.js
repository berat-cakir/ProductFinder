// Define global variables
var video, canvas, context, imageData, detector, posit;
var renderer, bgScene, bgCamera, texture;
var arScene = new Array();
var arCamera = new Array();
var model = new Array();
var detectedMarker = -1;
var direction = '0';  // Unknown
var allDirections = ['0', '1', '2', '3', '4', '5', '6', '7', '8'];  // Unknown, R, U, L, D, RU, LU, LD, RD
var modelSize = 70.0;  // Millimeters

// Estimate end-device and screen orientation
fixOrientation = function(w, h) {
    var md = new MobileDetect(window.navigator.userAgent), d = {
        w: w,
        h: h
    };
    if (md.phone() || md.tablet()) {
        if (md.userAgent() !== 'Safari') {
            d.w = h;
            d.h = w;
        }
    }
    return d;
};

// Main function
function onLoad() {
    // Get video dom element, container, and mobile attributes
    video = document.getElementById('video');
    arNav = document.getElementById('arNavigator');
    arNavWidth = parseInt(arNav.style.width.replace('px', ''));
    arNavHeight = parseInt(arNav.style.height.replace('px', ''));
    dim = fixOrientation(arNav.style.width, arNav.style.height);
    fixedWidth = parseInt(dim.w.replace('px', ''));
    fixedHeight = parseInt(dim.h.replace('px', ''));

    // Check availability and load UserMedia
    if (navigator.mediaDevices === undefined) {
        navigator.mediaDevices = {};
    }
    if (navigator.mediaDevices.getUserMedia === undefined) {
        navigator.mediaDevices.getUserMedia = function(constraints) {
            var getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
            if (!getUserMedia) {
                return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
            }
            return new Promise(function(resolve, reject) {
                getUserMedia.call(navigator, constraints, resolve, reject);
            });
        }
    }

    // Request access to webcam (front-camera: user, rear-camera: environment)
    navigator.mediaDevices
        .getUserMedia({video: {facingMode: 'environment', width: fixedWidth, height: fixedHeight}})
        .then(function(stream) {
            if ('srcObject' in video) {
                video.srcObject = stream;
            } else {
                video.src = window.URL.createObjectURL(stream);
            }
        })
        .catch(function(err) {
            console.log(err.name + ': ' + err.message);
        });

    // Create canvas element for video
    canvas = document.createElement('canvas');
    canvas.width = arNavWidth;
    canvas.height = arNavHeight;
    context = canvas.getContext('2d');

    // Define marker detector and pose estimator
    detector = new AR.Detector();
    posit = new POS.Posit(modelSize, canvas.width);

    // Send marker ID to server every x minute
    setInterval(function() { 
        $.ajax({
            url: '/navigator.html',
            data: { markerID: detectedMarker },
            type: 'POST',
            success: function(response) {
                direction = response;
                document.getElementById('markerID').innerHTML = detectedMarker;
            },
            error: function(error) {
                console.log(error);
            }
        });
        }, 1000 * 60 * 0.01);

    // Create renderer and scenes
    createRenderers();
    createScenes();

    // Detect markers and render textures
    requestAnimationFrame(tick);
};

// Create renderer for div container and its scenes
function createRenderers() {
    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(0xffffff, 1);
    renderer.setSize(canvas.width, canvas.height);
    document.getElementById('arNavigator').appendChild(renderer.domElement);

    // Background scene
    bgScene = new THREE.Scene();
    bgCamera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5);
    bgScene.add(bgCamera);

    // AR scene
    for (i = 0; i < allDirections.length; i++) {
        arScene.push(new THREE.Scene());
        arCamera.push(new THREE.PerspectiveCamera(40, canvas.width / canvas.height, 1, 1000));
        arScene[i].add(arCamera[i]);
    }
};

// Create textures plus models and add to scenes
function createScenes() {
    texture = createTexture();
    bgScene.add(texture);
    for (i = 0; i < allDirections.length; i++) {
        model.push(createModel(allDirections[i]));
        arScene[i].add(model[i]);
    }
};

// Create texture for background scene
function createTexture() {
    var texture = new THREE.Texture(video),
        object = new THREE.Object3D(),
        geometry = new THREE.PlaneBufferGeometry(1.0, 1.0, 0.0),
        material = new THREE.MeshBasicMaterial( {map: texture, depthTest: false, depthWrite: false} ),
        mesh = new THREE.Mesh(geometry, material);
    texture.minFilter = THREE.LinearFilter;
    object.position.z = -1;
    object.add(mesh);
    return object;
};

// Create model for AR scene
function createModel(direction) {
    var object = new THREE.Object3D(),
        geometry = new THREE.PlaneBufferGeometry(1.0, 1.0, 0.0),
        texture = THREE.ImageUtils.loadTexture('../static/textures/' + direction + '.jpg'),
        material = new THREE.MeshBasicMaterial( {map: texture, depthTest: false, depthWrite: false} ),
        mesh = new THREE.Mesh(geometry, material);
    texture.minFilter = THREE.LinearFilter;
    object.name = direction;
    object.add(mesh);
    return object;
};

// Animated frames (continuous)
function tick() {
    requestAnimationFrame(tick);
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        snapshot();

        // Detect markers
        var markers = detector.detect(imageData);
        if (markers.length > 0) {
            detectedMarker = markers[0].id;
        } else {
            detectedMarker = -1;
        }

        // Render markers
        updateScenes(markers);
        render();
    }
};

// Get single video frame
function snapshot() {
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    imageData = context.getImageData(0, 0, canvas.width, canvas.height);
};

// Get corners of marker and perform post estimation
function updateScenes(markers) {
    var corners, corner, pose, i;
    if (markers.length > 0) {
        corners = markers[0].corners;
        for (i = 0; i < corners.length; ++ i) {
            corner = corners[i];
            corner.x = corner.x - (canvas.width / 2);
            corner.y = (canvas.height / 2) - corner.y;
        }
        pose = posit.pose(corners);
        updateObject(model[parseInt(direction)], pose.bestRotation, pose.bestTranslation);
    }
    texture.children[0].material.map.needsUpdate = true;
};

// Update position and rotation of object
function updateObject(object, rotation, translation) {
    object.scale.x = modelSize;
    object.scale.y = modelSize;
    object.scale.z = modelSize;

    object.rotation.x = -Math.asin(-rotation[1][2]);
    object.rotation.y = -Math.atan2(rotation[0][2], rotation[2][2]);
    object.rotation.z = Math.atan2(rotation[1][0], rotation[1][1]);

    object.position.x = translation[0];
    object.position.y = translation[1];
    object.position.z = -translation[2];
};

// Render scenes
function render(){
    renderer.autoClear = false;
    renderer.clear();
    renderer.render(bgScene, bgCamera);
    if (detectedMarker != -1) {
        renderer.render(arScene[parseInt(direction)], arCamera[parseInt(direction)]);
    }
};

// Start AR Navigator
window.onload = onLoad;