//import export nix funktionieren => funktion meinz
function saveToFile() {
    const dataToSave = {
      listToDo: localStorage.getItem('listToDo'),
      listUrgent: localStorage.getItem('listUrgent'),
      listDone: localStorage.getItem('listDone'),
      listWorking: localStorage.getItem('listWorking')
    };

    const fileContent = JSON.stringify(dataToSave);
    const blob = new Blob([fileContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'saved-board.tms';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Funktion zum Laden von Daten aus einer ausgewählten Datei und Speichern im localStorage
  function loadFromFile(event) {
    const fileInput = event.target;
    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function(event) {
      const contents = event.target.result;
      const data = JSON.parse(contents);

      Object.keys(data).forEach(key => {
        localStorage.setItem(key, data[key]);
      });

      for (let i = 0; i < localStorage.length; i++){
        let key = localStorage.key(i);
        let value = localStorage.getItem(key);
        if (value === 'null') {
            localStorage.removeItem(key);
        }
      }
      location.reload();
      if (localStorage.getItem('listUrgent') === 'null') {
        localStorage.removeItem('listUrgent')
      }
      location.reload();
    };

    reader.readAsText(file);
  }

  //enddd