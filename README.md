<div align="center">
  <img src="https://github.com/user-attachments/assets/7845aef3-3c6d-4f82-adc9-c5b14bc2a096" alt="Angspire Logo" width="96">
</div>

# Angspire - Angular Frontend & Aspire Dot Net Backend

**Angspire** is an Angular + .NET (monorepo) project template designed to simplify development with out-of-the-box features like (basic) user authentication and frontend themes, reducing setup time and providing a scalable, maintainable foundation for your applications.

_Angular 19, Dot Net 9.0 & Aspire 9.0_
<br />
<br />

**IMPORTANT:**
- Running the dot net project, will also serve the angular project

**NOTE:**
- **Authentication:** _AspNetCore Identity for EntityFrameworkCore_
- **Database:** _PostgresSQL_


<table align="center">
  <tr>
    <th>Angular Page</th>
    <th>API on Swagger</th>
    <th>Aspire Dashboard</th>
  </tr>
  <tr>
    <td align="center">
      <img src="https://github.com/user-attachments/assets/95f863b6-0c7d-42f3-81c9-471d626a3df7" alt="Angular Page" width="300">
    </td>
    <td align="center">
      <img src="https://github.com/user-attachments/assets/a4e93984-b774-4cae-b8fd-f84f728e3d24" alt="API as seen on Swagger" width="300">
    </td>
    <td align="center">
      <img src="https://github.com/user-attachments/assets/180e2000-c313-4daf-977b-9aa86648c872" alt="Aspire Dashboard" width="300">
    </td>
  </tr>
</table>

---

# Theme-sync
This project comes with a `theme-sync.js` script which allows you to sync style variables through node commands.

**How to use theme-sync.js:**
1. creates variables in "styles.scss"
2. run: `node theme-sync update`
3. "themes.json" & "tailwind.config.js" will update

**Commands:**
- update: `node theme-sync update`
- clear: `node theme-sync clear`

**NOTE:**
- if you have more than one theme in the "themes.json" file and they are missing the new css variables, they will be created with the same value as the css variables

https://github.com/user-attachments/assets/843da791-19e4-4ac7-8eca-7ed4a4caa987

---

## Todo
- [ ] Sync themes from theme.json to styles.scss
- [ ] Theme Designer
- [ ] Open Swagger on project run

### [Changelog](https://github.com/tbarracha/Angspire/blob/main/CHANGELOG.md)
