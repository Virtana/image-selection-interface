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
    params: {Bucket: albumBucketName}
  });
}

// Get name of the episode from different file keys
function imageKeyToEpisodeName(key) {
  var keyArray = key.split('/');
  keyArray = keyArray.slice(1,-1);
  return keyArray.join('/');
}
function jsonKeyToEpisodeName(key) {
  key = key.slice(0,-5);
  var keyArray = key.split('/');
  keyArray = keyArray.slice(1, keyArray.length);
  return keyArray.join('/');
}

// List the episodes that exist in the bucket
function listEpisodes() {
  s3.listObjects(function(err, data) {
    if (err) {
      alert('There was an error accessing bucket: ' + err.message);
      window.location="index.html";
    } else {
      // Map episodes to their accompanying json file
      // The json file means the episode has already been down-selected from, it contains names of the images chosen for annotation
      var episodeToJsonFile = new Map();

      // Go through all images to determine what episodes have images in the bucket that we can down-select from
      // We initialize all episodes' accompanying json file in the map as non-existent
      data.Contents.forEach(function(bucketObject) {
        var key = bucketObject.Key;
        if (key.endsWith('.png')) {
          episodeToJsonFile.set(imageKeyToEpisodeName(key), '');
        }
      })

      // Find all json files and update map to reflect that they exist for the appropriate episode
      data.Contents.forEach(function(bucketObject) {
        var key = bucketObject.Key;
        if (key.endsWith('.json')) {
          episodeToJsonFile.set(jsonKeyToEpisodeName(key), key);
        }
      })

      // Array to store the HTML elements that will represent each available episode
      var episodesHtml = new Array();

      episodeToJsonFile.forEach(function(jsonKey, episodeName) {
        // Button to view the images from an episode
        var htmlElements = [
          '<li>',
            '<button class="button" style="margin:5px;" onclick="viewEpisode(\'' + episodeName + '\')">',
              episodeName,
            '</button>'
        ];
        // If the json file already exists, add a button to download the images specified by the file
        if (jsonKey != '') {
          htmlElements.push('<button class="download_button" style="margin:5px;" onclick="downloadImages(\'' + jsonKey + '\')">',
                            "Download Selected Images",
                            '</button>')
        }
        htmlElements.push('</li>');
        episodesHtml.push(getHtml(htmlElements));
      });

      var message = episodesHtml.length ?
        getHtml([
          '<p>Click on an episode to view images.</p>',
        ]) :
        '<p>No episodes could be found.';
      var htmlTemplate = [
        '<h2>Episodes</h2>',
        message,
        '<ul>',
          getHtml(episodesHtml),
        '</ul>',
      ];
      document.getElementById('header').innerHTML = getHtml(htmlTemplate);
      document.getElementById('viewer').innerHTML = "";
      document.getElementById('footer').innerHTML = "";
    }
  });
}

// Display the images in a given episode
function viewEpisode(episodeName) {
  var episodeImageFolderKey = 'vision-datasets/' + episodeName + '/';
  s3.listObjects({Prefix: episodeImageFolderKey}, function(err, data) {
    if (err) {
      return alert('There was an error viewing your album: ' + err.message);
    }
    var imagesHtml = data.Contents.map(function(imageObject) {
      var signedImageUrl = s3.getSignedUrl('getObject', {Key: imageObject.Key});
      return getHtml([
        '<li class="gallery_list_obj"><input type="checkbox" id="cb' + imageObject.Key + '" />',
          '<label class="gallery_obj_selection" for="cb' + imageObject.Key + '"><img src="' + signedImageUrl + '" /></label>',
        '</li>'
      ]);
    });
    var message = imagesHtml.length ?
      '<p>We found ' + imagesHtml.length + ' images: </p>' :
      '<p>No images found. This is likely an error.</p>';
    var headerTemplate = [
      '<div>',
        '<button class="button" onclick="listEpisodes()">',
          'Back To Episodes',
        '</button>',
      '</div>',
      '<h2>',
        'Episode: ' + episodeName,
      '</h2>',
      message
    ];
    var htmlTemplate = [
      '<ul id="gallery__list">',
        getHtml(imagesHtml),        
      '</ul>'
    ];
    var footerTemplate = [
      '<h2>',
        'End of Episode: ' + episodeName,
        '<button class="button" onclick="onSubmit()">',
          'Submit selected images. This will push a JSON file to the bucket specifying the chosen images.' +
          'This will replace any selection that may already exist.',
        '</button>',
      '</h2>',
      '<div>',
        '<button class="button" onclick="listEpisodes()">',
          'Back To Episodes',
        '</button>',
      '</div>'
    ];
    document.getElementById('header').innerHTML = getHtml(headerTemplate);
    document.getElementById('viewer').innerHTML = getHtml(htmlTemplate);
    document.getElementById('footer').innerHTML = getHtml(footerTemplate);
  });
}

// Download images from the bucket specified by an existing JSON file for the episode
function downloadImages(jsonKey) {
  var signedJsonUrl = s3.getSignedUrl('getObject', {Key: jsonKey});

  fetch(signedJsonUrl)
    .then(function (response) {
      return response.json();
    })
    .then(function (jsonObject) {
      // Iterate over image names and get pre-signed URLs for each that we can use to download from
      var signedImageUrls = jsonObject["ImagesForAnnotation"].map(function(imageName) {
        var imageKey = jsonObject["s3Prefix"].slice(5 + albumBucketName.length + 1) + jsonObject["EpisodeName"] + imageName;
        return s3.getSignedUrl('getObject', {Key: imageKey})
      });
      
      signedImageUrls.forEach(function(url) {
        var downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", url);
        downloadAnchorNode.setAttribute("download", "image.png");
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
      });
    });
}

// Make and push JSON file specifying user-selected images
function onSubmit() {
  var path = checkboxes[1].id.slice(2);
  var pathAsArray = path.split('/');

  // Name of episode
  var episode = pathAsArray.slice(1,-1).join('/') + '/';
  // The prefix can be concatenated with the episode name and image name to get an s3 location
  // This is included to help someone who may want to manually access the images
  var prefix = "s3://" + albumBucketName + '/' + pathAsArray.at(0) + '/';

  var imageNames = checkboxes.map(function(checkbox) {
    if (checkbox.checked) {
      var imageKeyArray = checkbox.id.slice(2).split('/');
      return imageKeyArray.at(-1);
    }
  });

  var jsonContent = {
    "s3Prefix": prefix,
    "EpisodeName": episode,
    "ImagesForAnnotation": imageNames
  };

  uploadJsonToS3(episode, jsonContent);
}

function uploadJsonToS3(episodeName, jsonObject) {
  var jsonKey = 'vision-datasets/' + episodeName.slice(0,-1) + ".json";

  // Use S3 ManagedUpload class as it supports multipart uploads
  var upload = new AWS.S3.ManagedUpload({
    params: {
      Bucket: albumBucketName,
      Key: jsonKey,
      Body: JSON.stringify(jsonObject),
    }
  });

  var promise = upload.promise();
  promise.then(
    function() {
      alert("Successfully uploaded JSON file.");
    },
    function(err) {
      return alert("There was an error uploading the JSON file: ", err.message);
    }
  );
}

// function downloadObjectAsJson(exportObj, exportName){
//   var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj));
//   var downloadAnchorNode = document.createElement('a');
//   downloadAnchorNode.setAttribute("href",     dataStr);
//   downloadAnchorNode.setAttribute("download", exportName + ".json");
//   document.body.appendChild(downloadAnchorNode); // required for firefox
//   downloadAnchorNode.click();
//   downloadAnchorNode.remove();
// }
