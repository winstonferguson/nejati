export default function initForms() {

  forms = document.querySelectorAll('form');

  console.log(forms);
  if (!forms) return;

  for (const form of forms) {
    console.log(form.id);
    const messageContainer = form.querySelector("#messageContainer");
    form.addEventListener('submit', function(event) {
      event.preventDefault();

      const formData = new FormData(form);

      const object = {};

      formData.forEach(function(value, key){
        if (value instanceof File) {
          object[key] = convertToBase64(value);
        } else {
          object[key] = value;
        }
      });

      for (const pair of formData.entries()) {
        if (pair[1] instanceof File) {
          convertToBase64(pair[1]);
        }

        console.log(pair[0] + ', ' + pair[1]);
      }


      
      /* make sure to replace the xxxxxxx with the form id you created on fabform.io */
      
      fetch(`https://fabform.io/f/${form.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(object)
      })
      .then(response => response.json())
      .then(data => {
        if (data.success === "true") {
          messageContainer.innerHTML = "<p style='color: green;'>Form submitted successfully!</p>";
        } else {
          throw new Error('Server response indicates failure');
        }
      })
      .catch(error => {
        console.error('Error:', error);
        messageContainer.innerHTML = "<p style='color: red;'>An error occurred while submitting the form.</p>";
      });
    })
  }
}

function convertToBase64(file) {
  //Read File
  //Check File is not Empty
  if (file) {
      // Select the very first file from list

      // FileReader function for read the file.
      const fileReader = new FileReader();
      let base64;
      // Onload of file read the file content
      fileReader.onload = function(fileLoadedEvent) {
          base64 = fileLoadedEvent.target.result;
          // Print data in console
          console.log(base64);
      };
      // Convert data to base64
      return fileReader.readAsDataURL(file);
  }
}
      
      
      
      
      
      
      
