/**
 * Copyright 2010-2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * This file is licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License. A copy of
 * the License is located at
 *
 * http://aws.amazon.com/apache2.0/
 *
 * This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
 * CONDITIONS OF ANY KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
 *
 */

// snippet-comment:[These are tags for the AWS doc team's sample catalog. Do not remove.]
// snippet-sourcedescription:[s3_PhotoViewer.js demonstrates how to allow viewing of photos in albums stored in an Amazon S3 bucket.]
// snippet-service:[s3]
// snippet-keyword:[JavaScript]
// snippet-sourcesyntax:[javascript]
// snippet-keyword:[Amazon S3]
// snippet-keyword:[Code Sample]
// snippet-sourcetype:[full-example]
// snippet-sourcedate:[2019-05-07]
// snippet-sourceauthor:[AWS-JSDG]

// ABOUT THIS JAVASCRIPT SAMPLE: This sample is part of the SDK for JavaScript Developer Guide topic at
// https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/s3-example-photos-view.html

// snippet-start:[s3.JavaScript.s3_PhotoViewer.complete]
//
// Data constructs and initialization.
//

// snippet-start:[s3.JavaScript.s3_PhotoViewer.config]
// **DO THIS**:
//   Replace BUCKET_NAME with the bucket name.
//
var albumBucketName = '';
// var albumBucketName = 'virtana-datasets-testing';

// Initialize the Amazon Cognito credentials provider
AWS.config.region = 'us-east-1'; // Region
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: '',
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
      //'<div style="position:relative ; margin:1rem">',
      '<ul>',
        getHtml(photos),        
      '</ul>'
      //'</div>',
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

// Save image links to JSON file
function onSubmit() {
  var checkboxes = document.getElementsByTagName('input');
  var images = document.getElementsByTagName('img');

  for (var i = 0; i < checkboxes.length; i++) {
    if (checkboxes[i].checked == true) {
      console.log("Image src: "  + images[i].src);
    }
  }
  // **Add functionality to forward to CloudFactory
}