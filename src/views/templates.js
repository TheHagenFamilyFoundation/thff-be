// Example data to fill in the template
// const data = {
//   name: 'John Doe',
//   items: ['Item 1', 'Item 2', 'Item 3']
// };

// Example usage
// const to = user.email;
// const subject = 'Test Email with Template';


export const template = `<p>Hello {{ name }},</p>
<p>This is a test email with variable content:</p>
<ul>
  {{#each items}}
  <li>{{ this }}</li>
  {{/each}}
</ul>`
