function loadPage() {
    window.location="photoviewer.html";
}

// Set region
AWS.config.region = 'us-east-2';

function saveCreds(creds){
  localStorage.setItem("creds", creds);
  AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: creds
  });

  AWS.config.getCredentials(function(err) {
    if (err){
      alert("Invalid credentials!");
    }
    else {
      loadPage();
    }
  });
}