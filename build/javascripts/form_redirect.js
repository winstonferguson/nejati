export default function formRedirect() {
  console.log(window.location);
  const params = new Proxy(new URLSearchParams(window.location.search), {
    get: (searchParams, prop) => searchParams.get(prop),
  });
  // Get the value of "some_key" in eg "https://example.com/?some_key=some_value"
  let value = params.form; // "some_value"

  console.log(value);  

  const container = document.querySelector('#container');
  let message = document.createElement('p');

  if (value == 'careers') {
    message.innerHTML = 'Your application has been received. We will endeavour to get back to you as soon as possible.';
  } else {
    message.innerHTML = 'Your message has been sent. We will endeavour to get back to you as soon as possible.';
  }

  container.innerHTML = message.outerHTML;
}
      
      
      
      
      
      
      
