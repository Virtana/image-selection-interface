// constants
const albumBucketName = 'virtana-image-access';

function loadPage() {
    window.location="photoviewer.html";
}


function setCredentials(creds) {
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
      IdentityPoolId: creds,
    });
  
    s3 = new AWS.S3({
      apiVersion: '2006-03-01',
      params: {Bucket: albumBucketName}
    });
    loadPage();
  }