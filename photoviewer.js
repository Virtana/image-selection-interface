// Constants
const albumBucketName = 'virtana-datasets-testing';

// Set region
AWS.config.region = 'us-east-2';

// A utility function to create HTML.
function getHtml(template) {
  return template.join('\n');
}

// Set credentials and initialize s3 bucket
function setCredentials() {
  var creds = localStorage.getItem("creds");
  AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: creds
  });

  s3 = new AWS.S3({
    apiVersion: '2006-03-01',
    params: { Bucket: albumBucketName }
  });
}

// Converting keys to other formats
function imageKeyToEpisodeName(key) {
  var keyArray = key.split('/');
  var imageFolder = keyArray.slice(1, -1).join('/');
  return imageFolder.slice(0, -7);
}
function jsonSummaryKeyToEpisodeName(key) {
  key = key.slice(0, -("_images_for_annotation.json".length));
  var keyArray = key.split('/');
  keyArray = keyArray.slice(1, keyArray.length);
  return keyArray.join('/');
}
function thumbnailKeyToImageKey(thumbnailKey) {
  var keyArray = thumbnailKey.split('/');
  var imageName = keyArray.pop().slice(0, -4);
  keyArray = keyArray.slice(0, -1);
  keyArray.push(imageName + '.png');
  return keyArray.join('/');
}
function jsonSummaryObjectToImageKey(jsonObject, imageName) {
  return jsonObject["ImageKeyPrefix"] + imageName;
}

function episodeNameToImageInfoKey(episodeName) {
  return 'vision-datasets/' + episodeName + '_images/image_info.json'
}

function addSections() {
  var headerDiv = document.createElement('div');
  var viewerDiv = document.createElement('div');
  var footerDiv = document.createElement('div');
  headerDiv.id = 'header';
  viewerDiv.id = 'viewer';
  footerDiv.id = 'footer';
  document.getElementById("pv").appendChild(headerDiv);
  document.getElementById("pv").appendChild(viewerDiv);
  document.getElementById("pv").appendChild(footerDiv);
}

function toggleHeaderSections(view) {
  document.getElementById("header_card").style.display = view;
}

// List the episodes that exist in the bucket
function listEpisodes() {
  // add div sections for gallery viewing
  addSections();

  document.getElementById("header_card").style.margin = "auto";

  s3.listObjects(function (err, data) {
    if (err) {
      alert('There was an error accessing bucket: ' + err.message);
      window.location = "index.html";
    } else {
      // Map episodes to the key of their accompanying json summary file
      // The json summary means the episode has already been down-selected from, it contains names of the images chosen for annotation
      var episodeToJsonSummaryKey = new Map();

      // Go through all images to determine what episodes have images in the bucket that we can down-select from
      // We initialize all episodes' accompanying json summary in the map as non-existent
      data.Contents.forEach(function (bucketObject) {
        var key = bucketObject.Key;
        if (key.endsWith('.png')) {
          episodeToJsonSummaryKey.set(imageKeyToEpisodeName(key), '');
        }
      })

      // Find all json summaries and update map to reflect that they exist for the appropriate episode
      data.Contents.forEach(function (bucketObject) {
        var key = bucketObject.Key;
        if (key.includes('images_for_annotation.json')) {
          episodeToJsonSummaryKey.set(jsonSummaryKeyToEpisodeName(key), key);
        }
      })

      // Array to store the HTML elements that will represent each available episode
      var episodesHtml = new Array();

      episodeToJsonSummaryKey.forEach(function (jsonKey, episodeName) {
        // Button to view the images from an episode
        var htmlElements = [
          '<li>',
          '<button class="basic_btn" style="margin:5px;" onclick="viewEpisode(\'' + episodeName + '\')">',
          episodeName,
          '</button>'
        ];
        // If the json summary already exists, add a button to download the images specified by it
        if (jsonKey != '') {
          htmlElements.push('<button class="download_button" style="margin:5px;" onclick="downloadImages(\'' + jsonKey + '\')">',
            '<i class="fa fa-folder"></i> ',
            " Download Selected Images",
            '</button>')
        }
        htmlElements.push('</li>');
        episodesHtml.push(getHtml(htmlElements));
      });

      var message = episodesHtml.length ?
        '<p>Click on an episode to view images.</p>' : '<p>No episodes could be found.';
      var htmlTemplate = [
        '<div class="general_card">',
        '<h2>Episodes</h2>',
        message,
        '<ul>',
        getHtml(episodesHtml),
        '</ul>',
        '</div>'
      ];

      var jsonKeys = Array.from(episodeToJsonSummaryKey.values()).filter(key => key != "");
      var footerTemplate = jsonKeys.length ?
        getHtml([
          '<button class="download_button" onclick="downloadAllImages(\'' + jsonKeys + '\')">',
          '<i class="fa fa-folder"></i>', 
          '  Download selected images from all episodes',
          '</button>',
        ]) :
        "No episodes have been down-selected yet";

      document.getElementById('header').innerHTML = getHtml(htmlTemplate);
      document.getElementById('viewer').innerHTML = footerTemplate;
      document.getElementById('footer').innerHTML = "";
    }
  });
  toggleHeaderSections("block");
}

function clickCheckbox(){
  var checkboxes = document.getElementsByTagName('input');

  var checkedArray = Array.from(checkboxes).map(function (checkbox) {
    if (checkbox.checked) { 
      return true;
    }
  }).filter(function (element) {
    if (element != null) {
      return element;
    }
  });
  
  const button = document.getElementsByClassName('dynamic_btn');
  if (checkedArray.length != 0){
    console.log(checkedArray.length)
    for (let i = 0; i < button.length; i++) {
      button[i].style.visibility = 'visible';
    }
  }
  else {
    console.log(checkedArray.length)
    for (let i = 0; i < button.length; i++) {
      button[i].style.visibility = 'hidden';
    }
  }
}

// Display the images in a given episode
function viewEpisode(episodeName) {
  var thumbnailFolderKey = 'vision-datasets/' + episodeName + '_images/thumbnails/';
  s3.listObjects({ Prefix: thumbnailFolderKey }, async function (err, data) {
    if (err) {
      return alert('There was an error viewing your album: ' + err.message);
    }
    var imagesHtml = data.Contents.map(function (thumbnailObject) {
      var signedThumbnailUrl = s3.getSignedUrl('getObject', { Key: thumbnailObject.Key });
      return getHtml([
        '<li class="gallery_list_obj"><input type="checkbox" onclick="clickCheckbox()" id="cb' + thumbnailKeyToImageKey(thumbnailObject.Key) + '" />',
        '<label class="gallery_obj_selection" for="cb' + thumbnailKeyToImageKey(thumbnailObject.Key) + '"><img src="' + signedThumbnailUrl + '" /></label>',
        '</li>'
      ]);
    });
    var message = imagesHtml.length ?
      '<p>' + imagesHtml.length + ' images found </p>' :
      '<p>No images found</p>';
    var headerTemplate = [
      '<div class="general_card">',
      '<button class="basic_btn" onclick="listEpisodes()">',
      '<i class="fa fa-long-arrow-left"></i> ',
      'Back To Episodes',
      '</button>',
      '<h2>',
      'Episode: ' + episodeName,
      '</h2>',
      message,
      '</div>'
    ];
    var htmlTemplate = [
      '<ul id="gallery__list">',
      getHtml(imagesHtml),
      '</ul>'
    ];
    var footerTemplate = [
      '<div class="general_card" style="margin-bottom: 100px">',
      '<h2>',
      'End of Episode: ' + episodeName,
      '</h2>',
      '<div>',
      '<div>',
      '<button style="float: left;" class="basic_btn" onclick="listEpisodes()">',
      '<i class="fa fa-long-arrow-left"></i> ',
      ' Back To Episodes',
      '</button>',
      '</div>',
      '<div>',
      '<button style="float: right; margin-left: 25px;" class="dynamic_btn" onclick="downloadSelected()">',
      '<i class="fa fa-folder"></i>', 
      ' Download Selected Images',
      '</button>',
      '</div>',
      '<div>',
      '<button style="float: right;" class="dynamic_btn" onclick="onSubmit()">',
      '<i class="fa fa-thumbs-up"></i> ',
      ' Submit new JSON summary',
      '</button>',
      '<br/>',
      '</div>',
      '</div>',
      '<br/>'
    ];

    var imageInfoKey = episodeNameToImageInfoKey(episodeName);
    var imageInfoUrl = s3.getSignedUrl('getObject', { Key: imageInfoKey });
    var ratio;
    await fetch(imageInfoUrl)
      .then((response) => response.json())
      .then(function (jsonObject) {
         ratio = jsonObject["resolution"]["width"] + '/' + jsonObject["resolution"]["height"];
      });

    document.getElementById('header').innerHTML = getHtml(headerTemplate);
    document.getElementById('viewer').innerHTML = getHtml(htmlTemplate);
    document.getElementById('footer').innerHTML = getHtml(footerTemplate);

    Array.from(document.getElementsByTagName('img')).forEach((img) => {
      img.style.aspectRatio = ratio;
    })
  });
  toggleHeaderSections("none");
}

// Download images from the bucket specified by an existing JSON summary file for the episode
function downloadImages(jsonSummaryKey) {

  var signedJsonUrl = s3.getSignedUrl('getObject', { Key: jsonSummaryKey });
  fetch(signedJsonUrl)
    .then((response) => response.json())
    .then(function (jsonObject) {
      var imageNameToUrl = new Map();
      // Iterate over image names and get pre-signed URLs for each that we can use to download from
      jsonObject["ImagesForAnnotation"].forEach(function (imageName) {
        var imageKey = jsonSummaryObjectToImageKey(jsonObject, imageName);
        var signedImageUrl = s3.getSignedUrl('getObject', { Key: imageKey });
        return imageNameToUrl.set(imageName, signedImageUrl);
      });
      var promises = new Array();
      var zip = JSZip();
      imageNameToUrl.forEach(function (signedUrl, imageName) {
        promises.push(fetch(signedUrl)
          .then(resp => resp.blob())
          .then(blob => zip.file('imagesForAnnotation/' + imageName, blob))
          .catch(() => alert('Error downloading ' + imageName)));
      });
      Promise.all(promises).then(() => {
        zip.generateAsync({ type: 'blob' }).then(function (zipFile) {
          var currentDate = new Date().getTime();
          return saveAs(zipFile, `imagesForAnnotation_${currentDate}.zip`);
        });
      });
    });
}

async function downloadAllImages(jsonSummaryKeys) {
  jsonSummaryKeys = jsonSummaryKeys.split(',').filter(key => key != "");

  var signedJsonUrls = jsonSummaryKeys.map((key) => s3.getSignedUrl('getObject', { Key: key }));
  var jsonFetchPromises = new Array();
  var imageNameToUrl = new Map();
  signedJsonUrls.forEach(function (jsonUrl) {
    jsonFetchPromises.push(fetch(jsonUrl)
      .then((response) => response.json())
      .then(function (jsonObject) {
        jsonObject["ImagesForAnnotation"].forEach(function (imageName) {
          var imageKey = jsonSummaryObjectToImageKey(jsonObject, imageName);
          var signedImageUrl = s3.getSignedUrl('getObject', { Key: imageKey });
          return imageNameToUrl.set(imageName, signedImageUrl);
        });
      }));
  });

  var imageFetchPromises = new Array();
  var zip = JSZip();

  await Promise.all(jsonFetchPromises);
  imageNameToUrl.forEach(function (signedUrl, imageName) {
    imageFetchPromises.push(fetch(signedUrl)
      .then(resp => resp.blob())
      .then(blob => zip.file('imagesForAnnotation/' + imageName, blob))
      .catch(() => alert('Error downloading ' + imageName)));
  });

  await Promise.all(imageFetchPromises);
  zip.generateAsync({ type: 'blob' }).then(zipFile => {
    var currentDate = new Date().getTime();
    return saveAs(zipFile, `imagesForAnnotation_${currentDate}.zip`);
  });
}

// Download user-selected images per temporary episode session
function downloadSelected() {
  var checkboxes = document.getElementsByTagName('input');
  var s3Prefix = "s3://" + albumBucketName + '/';

  var imageKeys = Array.from(checkboxes).map(function (checkbox) {
    if (checkbox.checked) {
      var imageKeyArray = checkbox.id.slice(2); 
      return imageKeyArray;
    }
  }).filter(function (element) {
    if (element != null) {
      return element;
    }
  });

  if (imageKeys.length != 0){ //this check is void with dynamic button
    var imageSignedURLs = new Map();
    var promises = new Array(); 
    var zip = JSZip();

    imageKeys.forEach(function (imageURL) {
      var signedImageUrl = s3.getSignedUrl('getObject', {Key: imageURL});
      imageName = imageURL.split('/').at(-1);
      return imageSignedURLs.set(imageName, signedImageUrl);
    });
    imageSignedURLs.forEach(function (signedUrl, imageName) {
      promises.push(fetch(signedUrl)
        .then(resp => resp.blob())
        .then(blob => zip.file(imageName, blob))
        .catch(() => alert('Error downloading ' + imageName)));
    });
    Promise.all(promises).then(() => { ////
      zip.generateAsync({ type: 'blob' }).then(function (zipFile) {
        var currentDate = new Date().getTime();
        return saveAs(zipFile, `tempSessionSelection_${currentDate}.zip`);
      });
    });
  }
  else {
    alert('No images selected to download!');
  }
}

// Make and push JSON summary file specifying user-selected images
function onSubmit() {
  var checkboxes = document.getElementsByTagName('input');

  // Image key, grabbed from any of the checkboxes except [0], it doesn't matter
  var imageKey = checkboxes[1].id.slice(2)
  // Last part of episode name, short identifier for the episode
  var episode = imageKeyToEpisodeName(imageKey).split('/').at(-1);
  // The s3Prefix can be concatenated with the imageKeyPrefix and the image name to get the image's s3 URI
  // OR the imageKeyPrefix can be concatenated with the image name to get the image's full key
  // These are included to help someone who may want to manually access the images, or write a script that does so
  var s3Prefix = "s3://" + albumBucketName + '/';
  var imageKeyArray = imageKey.split('/');
  imageKeyArray.splice(-1);
  var imageKeyPrefix = imageKeyArray.join('/') + '/';

  var imageNames = Array.from(checkboxes).map(function (checkbox) {
    if (checkbox.checked) {
      var imageKeyArray = checkbox.id.slice(2).split('/');
      return imageKeyArray.at(-1);
    }
  }).filter(function (element) {
    if (element != null) {
      return element;
    }
  });

  if (imageNames.length != 0){ //this check is void with dynamic button
    var jsonContent = {
      "s3Prefix": s3Prefix,
      "ImageKeyPrefix": imageKeyPrefix,
      "ImagesForAnnotation": imageNames,
      "Episode": episode,
    };
    uploadJsonSummaryToS3(jsonContent);
  }
  else {
    alert('No images selected to submit as JSON!');
  }
}

function uploadJsonSummaryToS3(jsonObject) {
  var jsonKey = jsonObject["ImageKeyPrefix"].slice(0, -1) + '_for_annotation.json'

  // Use S3 ManagedUpload class as it supports multipart uploads
  var upload = new AWS.S3.ManagedUpload({
    params: {
      Bucket: albumBucketName,
      Key: jsonKey,
      Body: JSON.stringify(jsonObject),
    }
  });

  var promise = upload.promise();
  promise.then(() => {
    alert("Successfully uploaded JSON summary file.");
    window.location = "photoviewer.html";
    // ** pass info to do this when the page reloads **
    // var button = document.getElementById("list_episodes");
    // button.click();   
  },
    (err) => { alert("There was an error uploading the JSON summary file: " + err.message) }
  );
}
