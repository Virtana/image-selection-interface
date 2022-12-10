// constants
const albumBucketName = 'virtana-datasets-testing';

// Initialize the Amazon Cognito credentials provider
AWS.config.region = 'us-east-2'; // Region

// A utility function to create HTML.
function getHtml(template) {
  return template.join('\n');
}

function setCredentials() {  
  var creds = localStorage.getItem("creds");
  AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: creds,
  });

  s3 = new AWS.S3({
    apiVersion: '2006-03-01',
    params: {Bucket: albumBucketName}
  });  
}

function imageKeyToEpisodeName(key) {
  keyArray = key.split('/');
  keyArray = keyArray.slice(1,-1);
  return keyArray.join('/');
}

function jsonKeyToEpisodeName(key) {
  key = key.slice(0,-5);
  keyArray = key.split('/');
  keyArray = keyArray.slice(1, keyArray.length);
  return keyArray.join('/');
}

// List the photo albums that exist in the bucket.
function listAlbums() {
  s3.listObjects(function(err, data) {
    if (err) {
      alert('There was an error listing your albums: ' + err.message);
      window.location="index.html";
    } else {
      var episodes = new Map();

      data.Contents.forEach(function(bucketObject) {
        var key = bucketObject.Key;
        if (key.endsWith('.png')) {
          episodes.set(imageKeyToEpisodeName(key), '')
        }
      })
      data.Contents.forEach(function(bucketObject) {
        var key = bucketObject.Key;
        if (key.endsWith('.json')) {
          episodes.set(jsonKeyToEpisodeName(key), key);
        }
      })

      var albums = new Array();
      episodes.forEach(function(jsonKey, episodeName) {
        var htmlElements = [
          '<li>',
            '<button class="button" style="margin:5px;" onclick="viewAlbum(\'' + episodeName + '\')">',
              episodeName,
            '</button>'
        ];
        if (jsonKey != '') {
          htmlElements.push('<button class="download_button" style="margin:5px;" onclick="downloadImages(\'' + jsonKey + '\')">',
                            "Download",
                            '</button>')
        }
        htmlElements.push('</li>');
        albums.push(getHtml(htmlElements));
      });

      var message = albums.length ?
        getHtml([
          '<p>Click on an album name to view it.</p>',
        ]) :
        '<p>You do not have any albums. Please Create album.';
      var htmlTemplate = [
        '<h2>Albums</h2>',
        message,
        '<ul>',
          getHtml(albums),
        '</ul>',
      ]
      document.getElementById('header').innerHTML = getHtml(htmlTemplate);
      document.getElementById('viewer').innerHTML = "";
      document.getElementById('footer').innerHTML = "";
    }
  });
}

// Show the photos that exist in an album.
function viewAlbum(albumName) {
  var albumPhotosKey = 'vision-datasets/' + albumName + '/';
  s3.listObjects({Prefix: albumPhotosKey}, function(err, data) {
    if (err) {
      return alert('There was an error viewing your album: ' + err.message);
    }
    var photos = data.Contents.map(function(photo) {
      var photoUrl = s3.getSignedUrl('getObject', {Key: photo.Key});
      return getHtml([
        '<li class="gallery_list_obj"><input type="checkbox" id="cb' + photo.Key + '" />',
          '<label class="gallery_obj_selection" for="cb' + photo.Key + '"><img src="' + photoUrl + '" /></label>',
        '</li>'
      ]);
    });
    var message = photos.length ?
      '<p>The following photos are present: ' + photos.length + '</p>' :
      '<p>There are no photos in this album.</p>';
    var headerTemplate = [
      '<div>',
        '<button class="button" onclick="listAlbums()">',
          'Back To Albums',
        '</button>',
      '</div>',
      '<h2>',
        'Album: ' + albumName,
      '</h2>',
      message
    ]

    var htmlTemplate = [
      '<ul id="gallery__list">',
        getHtml(photos),        
      '</ul>'
    ]

    var footerTemplate = [
      '<h2>',
        'End of Album: ' + albumName,
        '<button class="button" onclick="onSubmit(\'' + albumName + '\')">',
          'SUBMIT',
        '</button>',
      '</h2>',
      '<div>',
        '<button class="button" onclick="listAlbums()">',
          'Back To Albums',
        '</button>',
      '</div>'
    ]
    document.getElementById('header').innerHTML = getHtml(headerTemplate);
    document.getElementById('viewer').innerHTML = getHtml(htmlTemplate);
    document.getElementById('footer').innerHTML = getHtml(footerTemplate);
  });
}

// Make image info object for JSON download
function onSubmit(albumName) {
  var checkboxes = document.getElementsByTagName('input');
  var path = checkboxes[1].id.slice(2)
  var pathAsArray = path.split('/')
  var episode = pathAsArray.slice(1,-1).join('/') + '/'
  var prefix = "s3://" + albumBucketName + '/' + pathAsArray.at(0) + '/'
  var imageNames = [];
  for (var i = 0; i < checkboxes.length; i++) {
    if (checkboxes[i].checked) {
      var imageKeyArray = checkboxes[i].id.slice(2).split('/');
      imageNames.push(imageKeyArray.at(-1));
    }
  }
  var jsonContent = {
    "Prefix": prefix,
    "EpisodeName": episode,
    "ImagesForAnnotation": imageNames
  };
  uploadJsonToS3(episode, jsonContent)
}

function downloadImages(jsonKey) {
  var jsonUrl = s3.getSignedUrl('getObject', {Key: jsonKey});
  fetch(jsonUrl)
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      var jsonObject = data;
      var imageKeys = new Array();
      jsonObject["ImagesForAnnotation"].forEach(function(imageName){
        imageKeys.push(jsonObject["Prefix"].slice(5 + albumBucketName.length + 1) + jsonObject["EpisodeName"] + imageName);
      })
      var signedURLs = new Array();
      imageKeys.forEach(function(imageKey) {
        signedURLs.push(s3.getSignedUrl('getObject', {Key: imageKey}));
      })

      console.log(signedURLs);
      var downloadAnchorNode = document.createElement('a');
      document.body.appendChild(downloadAnchorNode); // required for firefox
      downloadAnchorNode.style.display = 'none';
   
      signedURLs.forEach(function(url) {

        downloadAnchorNode.setAttribute("href", url);
        downloadAnchorNode.setAttribute("download", url);
        downloadAnchorNode.click();
        // downloadAnchorNode.remove();
      
      })
      document.body.removeChild(downloadAnchorNode); // required for firefox

    })
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

function uploadJsonToS3(episodeName, exportObj) {

  var JsonKey = 'vision-datasets/' + episodeName.slice(0,-1) + ".json"

  // Use S3 ManagedUpload class as it supports multipart uploads
  var upload = new AWS.S3.ManagedUpload({
    params: {
      Bucket: albumBucketName,
      Key: JsonKey,
      Body: JSON.stringify(exportObj),
    }
  });

  var promise = upload.promise();
  promise.then(
    function(data) {
      alert("Successfully uploaded JSON file.");
    },
    function(err) {
      return alert("There was an error uploading the JSON file: ", err.message);
    }
  );
}

