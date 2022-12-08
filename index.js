function loadPage() {
    window.location="photoviewer.html";
}

function saveCreds(creds){
  localStorage.setItem("creds", creds);
  loadPage();
}