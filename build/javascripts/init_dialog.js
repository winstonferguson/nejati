import A11yDialog from 'a11y-dialog'


export default function initDialog() {
  const container = document.querySelector('#contact-dialog');
  const dialog = new A11yDialog(container);
}
