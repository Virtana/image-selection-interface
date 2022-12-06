// constants
const albumBucketName = 'virtana-image-access';

// Initialize the Amazon Cognito credentials provider
AWS.config.region = 'us-east-1'; // Region
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: 'us-east-1:5a6f6fec-b0db-41df-956a-ffd24d3787f4',
});

// Create a new service object
var s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  params: {Bucket: albumBucketName}
});

// A utility function to create HTML.
function getHtml(template) {
  return template.join('\n');
}

// List the photo albums that exist in the bucket.
function listAlbums() {
  s3.listObjects({Delimiter: '/'}, function(err, data) {
    if (err) {
      return alert('There was an error listing your albums: ' + err.message);
    } else {      
      var albums = data.CommonPrefixes.map(function(commonPrefix) {
        var prefix = commonPrefix.Prefix;
        var albumName = decodeURIComponent(prefix.replace('/', ''));
        return getHtml([
          '<li>',
            '<button class="button" style="margin:5px;" onclick="viewAlbum(\'' + albumName + '\')">',
              albumName,
            '</button>',
          '</li>'
        ]);
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
  var albumPhotosKey = encodeURIComponent(albumName) + '/';
  s3.listObjects({Prefix: albumPhotosKey}, function(err, data) {
    if (err) {
      return alert('There was an error viewing your album: ' + err.message);
    }
    var photos = data.Contents.map(function(photo) {
      var photoUrl = s3.getSignedUrl('getObject', {Key: photo.Key});
      return getHtml([
        '<li><input type="checkbox" id="cb' + photo.Key + '" />',
          '<label for="cb' + photo.Key + '"><img src="' + photoUrl + '" /></label>',
        '</li>'
      ]);
    });
    var message = photos.length ?
      '<p>The following photos are present: ' + photos.length + '</p>' :
      '<p>There are no photos in this album.</p>';
    var headerTemplate = [
      '<div>',
        '<button onclick="listAlbums()">',
          'Back To Albums',
        '</button>',
      '</div>',
      '<h2>',
        'Album: ' + albumName,
      '</h2>',
      message
    ]

    var htmlTemplate = [
      '<ul>',
        getHtml(photos),        
      '</ul>'
    ]

    var footerTemplate = [
      '<h2>',
        'End of Album: ' + albumName,
        '<button onclick="onSubmit()">',
          'SUBMIT',
        '</button>',
      '</h2>',
      '<div>',
        '<button onclick="listAlbums()">',
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
function onSubmit() {
  var checkboxes = document.getElementsByTagName('input');
  var images = document.getElementsByTagName('img');

  var imageNames = [];

  for (var i = 0; i < checkboxes.length; i++) {
    if (checkboxes[i].checked == true) {
      var imageKey = checkboxes[i].id.slice(2) ;
      imageNames.push(imageKey );
    }
  }
  
  var csvContent = {
    "S3Filepath":"s3::/zip-line-daa",
    "EpisodeName": "2022_11_22_12_30_00_zed_video",
    "ImagesForAnnotation: ": imageNames
  };    

  downloadObjectAsJson(csvContent, 'imageData');
}

function downloadObjectAsJson(exportObj, exportName){
  var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj));
  var downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href",     dataStr);
  downloadAnchorNode.setAttribute("download", exportName + ".json");
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}