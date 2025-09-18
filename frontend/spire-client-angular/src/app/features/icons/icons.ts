// npm run generate-icons    
// npm run update-icon-colors

import { Icon } from "../../lib/components/ui/icon-component/icon";

export const logo: Icon = {
  svg: `<svg viewBox="0 0 48 48" width="24" height="24" fill="none">
    <circle cx="24" cy="24" r="24" class="fill-logo" />
    <path d="M14 32L34 16" stroke="white" stroke-width="4" stroke-linecap="round"/>
  </svg>`,
  url: ''
}

export class Icons {

    public static readonly bash: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M2.25 5C2.25 3.48122 3.48122 2.25 5 2.25H19C20.5188 2.25 21.75 3.48122 21.75 5V19C21.75 20.5188 20.5188 21.75 19 21.75H5C3.48122 21.75 2.25 20.5188 2.25 19V5ZM6.29289 6.29289C6.68342 5.90237 7.31658 5.90237 7.70711 6.29289L9.70711 8.29289C10.0976 8.68342 10.0976 9.31658 9.70711 9.70711L7.70711 11.7071C7.31658 12.0976 6.68342 12.0976 6.29289 11.7071C5.90237 11.3166 5.90237 10.6834 6.29289 10.2929L7.58579 9L6.29289 7.70711C5.90237 7.31658 5.90237 6.68342 6.29289 6.29289ZM12 10C11.4477 10 11 10.4477 11 11C11 11.5523 11.4477 12 12 12H15C15.5523 12 16 11.5523 16 11C16 10.4477 15.5523 10 15 10H12Z" fill="currentColor"></path>
</svg>`,
        url: ''
    }
    
    public static readonly bookFilled: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M19.8779 1.25488C20.3678 1.30526 20.75 1.72179 20.75 2.22754V17.8633C20.75 18.403 20.3143 18.8408 19.7773 18.8408H19.6875C19.6572 18.8768 19.6244 18.9161 19.5928 18.96C19.4254 19.1924 19.292 19.4845 19.292 19.8184C19.292 20.152 19.4255 20.4434 19.5928 20.6758C19.6244 20.7198 19.6571 20.7598 19.6875 20.7959H19.7773C20.3142 20.7959 20.7499 21.2329 20.75 21.7725C20.75 22.3122 20.3143 22.75 19.7773 22.75H6.16699C4.55622 22.75 3.2501 21.4375 3.25 19.8184V4.18164C3.2501 2.56252 4.55622 1.25 6.16699 1.25H19.7773L19.8779 1.25488ZM6.16699 18.8398C5.63005 18.8398 5.19434 19.2777 5.19434 19.8174C5.19448 20.357 5.63014 20.7939 6.16699 20.7939H17.5C17.4082 20.5025 17.3477 20.1761 17.3477 19.8174C17.3477 19.4584 17.4081 19.1314 17.5 18.8398H6.16699ZM8.49902 10C7.94674 10 7.49902 10.4477 7.49902 11C7.49902 11.5523 7.94674 12 8.49902 12H12.499C13.0513 12 13.499 11.5523 13.499 11C13.499 10.4477 13.0513 10 12.499 10H8.49902ZM8.5 6C7.94772 6 7.5 6.44772 7.5 7C7.5 7.55228 7.94772 8 8.5 8H15.5C16.0523 8 16.5 7.55228 16.5 7C16.5 6.44772 16.0523 6 15.5 6H8.5Z" fill="currentColor" />
</svg>`,
        url: ''
    }
    
    public static readonly bookOutline: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M15.5 7H8.5M12.499 11H8.49902" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M20 22H6C4.89543 22 4 21.1046 4 20M4 20C4 18.8954 4.89543 18 6 18H20V6C20 4.11438 20 3.17157 19.4142 2.58579C18.8284 2 17.8856 2 16 2H10C7.17157 2 5.75736 2 4.87868 2.87868C4 3.75736 4 5.17157 4 8V20Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M19.5 18C19.5 18 18.5 18.7628 18.5 20C18.5 21.2372 19.5 22 19.5 22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
</svg>`,
        url: ''
    }
    
    public static readonly pin: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M3 21L8 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
    <path d="M13.2585 18.8714C9.51516 18.0215 5.97844 14.4848 5.12853 10.7415C4.99399 10.1489 4.92672 9.85266 5.12161 9.37197C5.3165 8.89129 5.55457 8.74255 6.03071 8.44509C7.10705 7.77265 8.27254 7.55888 9.48209 7.66586C11.1793 7.81598 12.0279 7.89104 12.4512 7.67048C12.8746 7.44991 13.1622 6.93417 13.7376 5.90269L14.4664 4.59604C14.9465 3.73528 15.1866 3.3049 15.7513 3.10202C16.316 2.89913 16.6558 3.02199 17.3355 3.26771C18.9249 3.84236 20.1576 5.07505 20.7323 6.66449C20.978 7.34417 21.1009 7.68401 20.898 8.2487C20.6951 8.8134 20.2647 9.05346 19.4039 9.53358L18.0672 10.2792C17.0376 10.8534 16.5229 11.1406 16.3024 11.568C16.0819 11.9955 16.162 12.8256 16.3221 14.4859C16.4399 15.7068 16.2369 16.88 15.5555 17.9697C15.2577 18.4458 15.1088 18.6839 14.6283 18.8786C14.1477 19.0733 13.8513 19.006 13.2585 18.8714Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
</svg>`,
        url: ''
    }
    
    public static readonly dashboardAdmin: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M17.25 2.25C17.8023 2.25 18.25 2.69772 18.25 3.25V3.65726C18.4161 3.71097 18.5764 3.77767 18.7297 3.85613L19.0178 3.56802C19.4083 3.1775 20.0415 3.1775 20.432 3.56802C20.8225 3.95854 20.8225 4.59171 20.432 4.98223L20.144 5.27026C20.2225 5.42353 20.2892 5.58388 20.3429 5.75009L20.7498 5.75C21.3021 5.74988 21.7499 6.1975 21.75 6.74979C21.7501 7.30207 21.3025 7.74988 20.7502 7.75L20.3431 7.75009C20.2893 7.91629 20.2226 8.07665 20.1441 8.22992L20.432 8.51777C20.8225 8.90829 20.8225 9.54146 20.432 9.93198C20.0415 10.3225 19.4083 10.3225 19.0178 9.93198L18.73 9.64422C18.5767 9.72276 18.4163 9.78952 18.25 9.84327V10.25C18.25 10.8023 17.8023 11.25 17.25 11.25C16.6977 11.25 16.25 10.8023 16.25 10.25V9.84327C16.0837 9.78952 15.9233 9.72276 15.77 9.64422L15.4822 9.93198C15.0917 10.3225 14.4585 10.3225 14.068 9.93198C13.6775 9.54146 13.6775 8.90829 14.068 8.51777L14.3559 8.22992C14.2774 8.07665 14.2107 7.91629 14.1569 7.75009L13.7498 7.75C13.1975 7.74988 12.7499 7.30207 12.75 6.74979C12.7501 6.1975 13.1979 5.74988 13.7502 5.75L14.1571 5.75009C14.2108 5.58388 14.2775 5.42353 14.356 5.27026L14.068 4.98223C13.6775 4.59171 13.6775 3.95854 14.068 3.56802C14.4585 3.1775 15.0917 3.1775 15.4822 3.56802L15.7703 3.85613C15.9236 3.77766 16.0839 3.71097 16.25 3.65726V3.25C16.25 2.69772 16.6977 2.25 17.25 2.25ZM17.25 5.50026C16.9046 5.50026 16.5935 5.63905 16.3662 5.86631C16.1388 6.09361 16 6.40477 16 6.75026C16 7.09568 16.1388 7.40678 16.366 7.63407C16.5933 7.86142 16.9045 8.00026 17.25 8.00026C17.5955 8.00026 17.9067 7.86142 18.134 7.63407C18.3612 7.40678 18.5 7.09568 18.5 6.75026C18.5 6.40477 18.3612 6.09361 18.1338 5.86631C17.9065 5.63905 17.5954 5.50026 17.25 5.50026Z" fill="currentColor"></path>
    <path d="M2.25 4C2.25 3.0335 3.0335 2.25 4 2.25H9.5C10.4665 2.25 11.25 3.0335 11.25 4V9.5C11.25 10.4665 10.4665 11.25 9.5 11.25H4C3.0335 11.25 2.25 10.4665 2.25 9.5V4Z" fill="currentColor"></path>
    <path d="M2.25 14.5C2.25 13.5335 3.0335 12.75 4 12.75H9.5C10.4665 12.75 11.25 13.5335 11.25 14.5V20C11.25 20.9665 10.4665 21.75 9.5 21.75H4C3.0335 21.75 2.25 20.9665 2.25 20V14.5Z" fill="currentColor"></path>
    <path d="M12.75 14.5C12.75 13.5335 13.5335 12.75 14.5 12.75H20C20.9665 12.75 21.75 13.5335 21.75 14.5V20C21.75 20.9665 20.9665 21.75 20 21.75H14.5C13.5335 21.75 12.75 20.9665 12.75 20V14.5Z" fill="currentColor"></path>
</svg>`,
        url: ''
    }
    
    public static readonly dashboard: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M9.5 3H4C3.44772 3 3 3.44772 3 4V9.5C3 10.0523 3.44772 10.5 4 10.5H9.5C10.0523 10.5 10.5 10.0523 10.5 9.5V4C10.5 3.44772 10.0523 3 9.5 3Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"></path>
    <path d="M20 3H14.5C13.9477 3 13.5 3.44772 13.5 4V9.5C13.5 10.0523 13.9477 10.5 14.5 10.5H20C20.5523 10.5 21 10.0523 21 9.5V4C21 3.44772 20.5523 3 20 3Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"></path>
    <path d="M9.5 13.5H4C3.44772 13.5 3 13.9477 3 14.5V20C3 20.5523 3.44772 21 4 21H9.5C10.0523 21 10.5 20.5523 10.5 20V14.5C10.5 13.9477 10.0523 13.5 9.5 13.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"></path>
    <path d="M20 13.5H14.5C13.9477 13.5 13.5 13.9477 13.5 14.5V20C13.5 20.5523 13.9477 21 14.5 21H20C20.5523 21 21 20.5523 21 20V14.5C21 13.9477 20.5523 13.5 20 13.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"></path>
</svg>`,
        url: ''
    }

    public static readonly home: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M3 9.98834V19.5C3 20.6046 3.89543 21.5 5 21.5H19C20.1046 21.5 21 20.6046 21 19.5V9.98834C21 9.3654 20.7097 8.77803 20.2149 8.39963L12.8972 2.80373C12.6396 2.60673 12.3243 2.5 12 2.5C11.6757 2.5 11.3604 2.60673 11.1028 2.80373L3.7851 8.39963C3.29026 8.77804 3 9.3654 3 9.98834Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M16 17H8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
</svg>`,
        url: ''
    }
    
    public static readonly settings: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M16.3083 4.38394C15.7173 4.38394 15.4217 4.38394 15.1525 4.28405C15.1151 4.27017 15.0783 4.25491 15.042 4.23828C14.781 4.11855 14.5721 3.90959 14.1541 3.49167C13.1922 2.52977 12.7113 2.04882 12.1195 2.00447C12.04 1.99851 11.96 1.99851 11.8805 2.00447C11.2887 2.04882 10.8077 2.52977 9.84585 3.49166C9.42793 3.90959 9.21897 4.11855 8.95797 4.23828C8.92172 4.25491 8.88486 4.27017 8.84747 4.28405C8.57825 4.38394 8.28273 4.38394 7.69171 4.38394H7.58269C6.07478 4.38394 5.32083 4.38394 4.85239 4.85239C4.38394 5.32083 4.38394 6.07478 4.38394 7.58269V7.69171C4.38394 8.28273 4.38394 8.57825 4.28405 8.84747C4.27017 8.88486 4.25491 8.92172 4.23828 8.95797C4.11855 9.21897 3.90959 9.42793 3.49166 9.84585C2.52977 10.8077 2.04882 11.2887 2.00447 11.8805C1.99851 11.96 1.99851 12.04 2.00447 12.1195C2.04882 12.7113 2.52977 13.1922 3.49166 14.1541C3.90959 14.5721 4.11855 14.781 4.23828 15.042C4.25491 15.0783 4.27017 15.1151 4.28405 15.1525C4.38394 15.4217 4.38394 15.7173 4.38394 16.3083V16.4173C4.38394 17.9252 4.38394 18.6792 4.85239 19.1476C5.32083 19.6161 6.07478 19.6161 7.58269 19.6161H7.69171C8.28273 19.6161 8.57825 19.6161 8.84747 19.716C8.88486 19.7298 8.92172 19.7451 8.95797 19.7617C9.21897 19.8815 9.42793 20.0904 9.84585 20.5083C10.8077 21.4702 11.2887 21.9512 11.8805 21.9955C11.96 22.0015 12.0399 22.0015 12.1195 21.9955C12.7113 21.9512 13.1922 21.4702 14.1541 20.5083C14.5721 20.0904 14.781 19.8815 15.042 19.7617C15.0783 19.7451 15.1151 19.7298 15.1525 19.716C15.4217 19.6161 15.7173 19.6161 16.3083 19.6161H16.4173C17.9252 19.6161 18.6792 19.6161 19.1476 19.1476C19.6161 18.6792 19.6161 17.9252 19.6161 16.4173V16.3083C19.6161 15.7173 19.6161 15.4217 19.716 15.1525C19.7298 15.1151 19.7451 15.0783 19.7617 15.042C19.8815 14.781 20.0904 14.5721 20.5083 14.1541C21.4702 13.1922 21.9512 12.7113 21.9955 12.1195C22.0015 12.0399 22.0015 11.96 21.9955 11.8805C21.9512 11.2887 21.4702 10.8077 20.5083 9.84585C20.0904 9.42793 19.8815 9.21897 19.7617 8.95797C19.7451 8.92172 19.7298 8.88486 19.716 8.84747C19.6161 8.57825 19.6161 8.28273 19.6161 7.69171V7.58269C19.6161 6.07478 19.6161 5.32083 19.1476 4.85239C18.6792 4.38394 17.9252 4.38394 16.4173 4.38394H16.3083Z" stroke="currentColor" stroke-width="1.5" />
    <path d="M15.5 12C15.5 13.933 13.933 15.5 12 15.5C10.067 15.5 8.5 13.933 8.5 12C8.5 10.067 10.067 8.5 12 8.5C13.933 8.5 15.5 10.067 15.5 12Z" stroke="currentColor" stroke-width="1.5" />
</svg>`,
        url: ''
    } ;

    public static readonly more: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M10.4922 12C10.4922 11.1716 11.1638 10.5 11.9922 10.5H12.0012C12.8296 10.5 13.5012 11.1716 13.5012 12C13.5012 12.8284 12.8296 13.5 12.0012 13.5H11.9922C11.1638 13.5 10.4922 12.8284 10.4922 12Z" fill="currentColor" />
    <path fill-rule="evenodd" clip-rule="evenodd" d="M16.492 12C16.492 11.1716 17.1636 10.5 17.992 10.5H18.001C18.8294 10.5 19.501 11.1716 19.501 12C19.501 12.8284 18.8294 13.5 18.001 13.5H17.992C17.1636 13.5 16.492 12.8284 16.492 12Z" fill="currentColor" />
    <path fill-rule="evenodd" clip-rule="evenodd" d="M4.49982 12C4.49982 11.1716 5.17139 10.5 5.99982 10.5H6.0088C6.83723 10.5 7.5088 11.1716 7.5088 12C7.5088 12.8284 6.83723 13.5 6.0088 13.5H5.99982C5.17139 13.5 4.49982 12.8284 4.49982 12Z" fill="currentColor" />
</svg>`,
        url: ''
    } ;
    
    public static readonly user: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" stroke-width="1.5"></path>
    <path d="M14.75 9.5C14.75 11.0188 13.5188 12.25 12 12.25C10.4812 12.25 9.25 11.0188 9.25 9.5C9.25 7.98122 10.4812 6.75 12 6.75C13.5188 6.75 14.75 7.98122 14.75 9.5Z" stroke="currentColor" stroke-width="1.5"></path>
    <path d="M5.49994 19.0001L6.06034 18.0194C6.95055 16.4616 8.60727 15.5001 10.4016 15.5001H13.5983C15.3926 15.5001 17.0493 16.4616 17.9395 18.0194L18.4999 19.0001" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
</svg>`,
        url: ''
    } ;

    public static readonly logout: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 17 5-5-5-5"></path><path d="M21 12H9"></path><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path></svg>`,
        url: ''
    } ;

    public static readonly eyeOn: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15C13.6569 15 15 13.6569 15 12Z" stroke="currentColor" stroke-width="1.5" />
    <path d="M12 5C16.1818 5 19.764 9.01321 21.2572 10.9622C21.7314 11.5813 21.7314 12.4187 21.2572 13.0378C19.764 14.9868 16.1818 19 12 19C7.81823 19 4.23598 14.9868 2.74283 13.0378C2.26856 12.4187 2.26857 11.5813 2.74283 10.9622C4.23598 9.01321 7.81823 5 12 5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
</svg>`,
        url: ''
    } ;

    public static readonly eyeOff: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M19.439 15.439C20.3636 14.5212 21.0775 13.6091 21.544 12.955C21.848 12.5287 22 12.3155 22 12C22 11.6845 21.848 11.4713 21.544 11.045C20.1779 9.12944 16.6892 5 12 5C11.0922 5 10.2294 5.15476 9.41827 5.41827M6.74742 6.74742C4.73118 8.1072 3.24215 9.94266 2.45604 11.045C2.15201 11.4713 2 11.6845 2 12C2 12.3155 2.15201 12.5287 2.45604 12.955C3.8221 14.8706 7.31078 19 12 19C13.9908 19 15.7651 18.2557 17.2526 17.2526" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M9.85786 10C9.32783 10.53 9 11.2623 9 12.0711C9 13.6887 10.3113 15 11.9289 15C12.7377 15 13.47 14.6722 14 14.1421" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    <path d="M3 3L21 21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
</svg>`,
        url: ''
    } ;

    public static readonly search: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M17 17L21 21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19C15.4183 19 19 15.4183 19 11Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
</svg>`,
        url: ''
    } ;

    public static readonly add: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M12.001 5.00003V19.002" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M19.002 12.002L4.99998 12.002" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
</svg>`,
        url: ''
    } ;
    
    public static readonly edit: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M3.78181 16.3092L3 21L7.69086 20.2182C8.50544 20.0825 9.25725 19.6956 9.84119 19.1116L20.4198 8.53288C21.1934 7.75922 21.1934 6.5049 20.4197 5.73126L18.2687 3.58024C17.495 2.80658 16.2406 2.80659 15.4669 3.58027L4.88841 14.159C4.30447 14.7429 3.91757 15.4947 3.78181 16.3092Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M14 6L18 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
</svg>`,
        url: ''
    } ;
    
    public static readonly editLine: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M8.17151 19.8284L19.8284 8.17157C20.3736 7.62632 20.6462 7.3537 20.792 7.0596C21.0693 6.50005 21.0693 5.8431 20.792 5.28354C20.6462 4.98945 20.3736 4.71682 19.8284 4.17157C19.2831 3.62632 19.0105 3.3537 18.7164 3.20796C18.1568 2.93068 17.4999 2.93068 16.9403 3.20796C16.6462 3.3537 16.3736 3.62632 15.8284 4.17157L4.17151 15.8284C3.59345 16.4064 3.30442 16.6955 3.15218 17.063C2.99994 17.4305 2.99994 17.8393 2.99994 18.6568V20.9999H5.34308C6.16059 20.9999 6.56934 20.9999 6.93688 20.8477C7.30442 20.6955 7.59345 20.4064 8.17151 19.8284Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M12 21H18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M14.5 5.5L18.5 9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
</svg>`,
        url: ''
    } ;
    
    public static readonly editAi: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M6.53792 2.32172C6.69664 1.89276 7.30336 1.89276 7.46208 2.32172L8.1735 4.2443C8.27331 4.51403 8.48597 4.72669 8.7557 4.8265L10.6783 5.53792C11.1072 5.69664 11.1072 6.30336 10.6783 6.46208L8.7557 7.1735C8.48597 7.27331 8.27331 7.48597 8.1735 7.7557L7.46208 9.67828C7.30336 10.1072 6.69665 10.1072 6.53792 9.67828L5.8265 7.7557C5.72669 7.48597 5.51403 7.27331 5.2443 7.1735L3.32172 6.46208C2.89276 6.30336 2.89276 5.69665 3.32172 5.53792L5.2443 4.8265C5.51403 4.72669 5.72669 4.51403 5.8265 4.2443L6.53792 2.32172Z" stroke="currentColor" stroke-width="1.5" />
    <path d="M14.4039 9.64136L15.8869 11.1244M6 22H7.49759C8.70997 22 9.31617 22 9.86124 21.7742C10.4063 21.5484 10.835 21.1198 11.6923 20.2625L19.8417 12.1131C20.3808 11.574 20.6503 11.3045 20.7944 11.0137C21.0685 10.4605 21.0685 9.81094 20.7944 9.25772C20.6503 8.96695 20.3808 8.69741 19.8417 8.15832C19.3026 7.61924 19.0331 7.3497 18.7423 7.20561C18.1891 6.93146 17.5395 6.93146 16.9863 7.20561C16.6955 7.3497 16.426 7.61924 15.8869 8.15832L7.73749 16.3077C6.8802 17.165 6.45156 17.5937 6.22578 18.1388C6 18.6838 6 19.29 6 20.5024V22Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
</svg>`,
        url: ''
    } ;

    public static readonly copy: Icon = {
        svg:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M13 22C14.1046 22 15 21.1046 15 20V11.0014C15 9.89629 14.1037 9.00063 12.9986 9.00141L3.9986 9.00776C2.8946 9.00854 2 9.90374 2 11.0078V20C2 21.1046 2.8954 22 4 22H13Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M7 8.42857V4.00907C7 2.90504 7.8946 2.00984 8.9986 2.00907L19.9986 2.0014C21.1037 2.00063 22 2.89628 22 4.0014V15C22 16.1046 21.1046 17 20 17H15.5714" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
</svg>`,
        url: ''
    } ;
    
    public static readonly check: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M4.25 13.5L8.75 18L19.75 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
</svg>`,
        url: ''
    } ;

    public static readonly close: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M18 6L6.00081 17.9992M17.9992 18L6 6.00085" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
</svg>`,
        url: ''
    } ;
    
    public static readonly delete: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M19.5 5.5L18.8803 15.5251C18.7219 18.0864 18.6428 19.3671 18.0008 20.2879C17.6833 20.7431 17.2747 21.1273 16.8007 21.416C15.8421 22 14.559 22 11.9927 22C9.42312 22 8.1383 22 7.17905 21.4149C6.7048 21.1257 6.296 20.7408 5.97868 20.2848C5.33688 19.3626 5.25945 18.0801 5.10461 15.5152L4.5 5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    <path d="M3 5.5H21M16.0557 5.5L15.3731 4.09173C14.9196 3.15626 14.6928 2.68852 14.3017 2.39681C14.215 2.3321 14.1231 2.27454 14.027 2.2247C13.5939 2 13.0741 2 12.0345 2C10.9688 2 10.436 2 9.99568 2.23412C9.8981 2.28601 9.80498 2.3459 9.71729 2.41317C9.32164 2.7167 9.10063 3.20155 8.65861 4.17126L8.05292 5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
</svg>`,
        url: ''
    } ;
    
    public static readonly stopSquare: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M3.25 7C3.25 4.92893 4.92893 3.25 7 3.25H17C19.0711 3.25 20.75 4.92893 20.75 7V17C20.75 19.0711 19.0711 20.75 17 20.75H7C4.92893 20.75 3.25 19.0711 3.25 17V7Z" fill="currentColor" />
</svg>`,
        url: ''
    } ;
    
    public static readonly chat: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M10 21.7713C9.21896 21.5882 8.48465 21.3017 7.77536 20.9358C7.27207 20.6762 6.69036 20.5929 6.14794 20.7556L3.77882 21.4664C3.01602 21.6952 2.3048 20.984 2.53365 20.2212L3.24438 17.8521C3.40711 17.3096 3.32379 16.7279 3.06417 16.2246C2.40213 14.9412 2 13.5759 2 12C2 6.47715 6.47715 2 12 2C16.6596 2 20.3899 5.18693 21.5 9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M16.5 22C13.4624 22 11 19.5376 11 16.5C11 13.4624 13.4624 11 16.5 11C19.5376 11 22 13.4624 22 16.5C22 17.3667 21.7788 18.1177 21.4147 18.8236C21.2719 19.1004 21.2261 19.4203 21.3156 19.7186L21.7065 21.0216C21.8324 21.4412 21.4412 21.8324 21.0216 21.7065L19.7186 21.3156C19.4203 21.2261 19.1004 21.2719 18.8236 21.4147C18.1177 21.7788 17.3667 22 16.5 22Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
</svg>`,
        url: ''
    };

    public static readonly chatNew: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M15.7071 5.29289L17.5 3.5C17.8905 3.10948 18.5237 3.10948 18.9142 3.5L20.5 5.08579C20.8905 5.47631 20.8905 6.10947 20.5 6.5L18.7071 8.29289M15.7071 5.29289L9.59886 11.4012C9.34255 11.6575 9.16071 11.9787 9.07279 12.3303L8.20715 15.7929L11.6697 14.9272C12.0214 14.8393 12.3425 14.6575 12.5989 14.4012L18.7071 8.29289M15.7071 5.29289L18.7071 8.29289" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
    <path d="M10.7071 4.79289H5.20715C4.10258 4.79289 3.20715 5.68832 3.20715 6.79289V18.7929C3.20715 19.8975 4.10258 20.7929 5.20715 20.7929H17.2071C18.3117 20.7929 19.2071 19.8975 19.2071 18.7929V13.2929" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
</svg>`,
        url: ''
    };

    public static readonly chatPrivate: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M9.85431 1.20935C10.5491 1.07191 11.2666 1 12 1C12.7334 1 13.4509 1.07191 14.1457 1.20935C14.6875 1.31653 15.0398 1.84262 14.9326 2.38441C14.8254 2.92619 14.2993 3.27851 13.7576 3.17133C13.1899 3.05903 12.6023 3 12 3C11.3977 3 10.8101 3.05903 10.2424 3.17133C9.70066 3.27851 9.17457 2.92619 9.06739 2.38441C8.96021 1.84262 9.31253 1.31653 9.85431 1.20935ZM16.7252 3.12803C17.0324 2.66909 17.6535 2.54613 18.1125 2.85338C19.3116 3.65618 20.3438 4.68839 21.1466 5.88752C21.4539 6.34645 21.3309 6.96756 20.872 7.27481C20.413 7.58206 19.7919 7.45909 19.4847 7.00016C18.8273 6.01827 17.9817 5.17268 16.9998 4.51531C16.5409 4.20807 16.4179 3.58696 16.7252 3.12803ZM7.27481 3.12803C7.58206 3.58696 7.45909 4.20807 7.00016 4.51531C6.01827 5.17268 5.17268 6.01827 4.51531 7.00016C4.20807 7.45909 3.58696 7.58206 3.12803 7.27481C2.66909 6.96757 2.54613 6.34646 2.85338 5.88752C3.65618 4.68839 4.68839 3.65618 5.88752 2.85338C6.34645 2.54613 6.96756 2.6691 7.27481 3.12803ZM21.6156 9.06739C22.1574 8.96021 22.6835 9.31253 22.7906 9.85431C22.9281 10.5491 23 11.2666 23 12C23 12.7334 22.9281 13.4509 22.7906 14.1457C22.6835 14.6875 22.1574 15.0398 21.6156 14.9326C21.0738 14.8254 20.7215 14.2993 20.8287 13.7576C20.941 13.1899 21 12.6023 21 12C21 11.3977 20.941 10.8101 20.8287 10.2424C20.7215 9.70066 21.0738 9.17457 21.6156 9.06739ZM2.38441 9.06739C2.92619 9.17457 3.27851 9.70066 3.17133 10.2424C3.05903 10.8101 3 11.3977 3 12C3 12.6023 3.05903 13.1899 3.17133 13.7576C3.27851 14.2993 2.92619 14.8254 2.38441 14.9326C1.84262 15.0398 1.31653 14.6875 1.20935 14.1457C1.07191 13.4509 1 12.7334 1 12C1 11.2666 1.07191 10.5491 1.20935 9.85431C1.31653 9.31253 1.84262 8.96021 2.38441 9.06739ZM20.872 16.7252C21.3309 17.0324 21.4539 17.6535 21.1466 18.1125C20.3438 19.3116 19.3116 20.3438 18.1125 21.1466C17.6535 21.4539 17.0324 21.3309 16.7252 20.872C16.4179 20.413 16.5409 19.7919 16.9998 19.4847C17.9817 18.8273 18.8273 17.9817 19.4847 16.9998C19.7919 16.5409 20.413 16.4179 20.872 16.7252ZM3.12803 16.7252C3.58696 16.4179 4.20807 16.5409 4.51531 16.9998C5.17268 17.9817 6.01827 18.8273 7.00016 19.4847C7.45909 19.7919 7.58206 20.413 7.27481 20.872C6.96757 21.3309 6.34646 21.4539 5.88752 21.1466C4.68839 20.3438 3.65618 19.3116 2.85338 18.1125C2.54613 17.6535 2.6691 17.0324 3.12803 16.7252ZM9.06739 21.6156C9.17457 21.0738 9.70066 20.7215 10.2424 20.8287C10.8101 20.941 11.3977 21 12 21C12.6023 21 13.1899 20.941 13.7576 20.8287C14.2993 20.7215 14.8254 21.0738 14.9326 21.6156C15.0398 22.1574 14.6875 22.6835 14.1457 22.7906C13.4509 22.9281 12.7334 23 12 23C11.2666 23 10.5491 22.9281 9.85431 22.7906C9.31253 22.6835 8.96021 22.1574 9.06739 21.6156Z" fill="currentColor"></path>
</svg>`,
        url: ''
    };

    public static readonly folderClosed: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M8 7H16.75C18.8567 7 19.91 7 20.6667 7.50559C20.9943 7.72447 21.2755 8.00572 21.4944 8.33329C22 9.08996 22 10.1433 22 12.25C22 15.7612 22 17.5167 21.1573 18.7779C20.7926 19.3238 20.3238 19.7926 19.7779 20.1573C18.5167 21 16.7612 21 13.25 21H12C7.28595 21 4.92893 21 3.46447 19.5355C2 18.0711 2 15.714 2 11V7.94427C2 6.1278 2 5.21956 2.38032 4.53806C2.65142 4.05227 3.05227 3.65142 3.53806 3.38032C4.21956 3 5.1278 3 6.94427 3C8.10802 3 8.6899 3 9.19926 3.19101C10.3622 3.62712 10.8418 4.68358 11.3666 5.73313L12 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
</svg>`,
        url: ''
    } ;

    public static readonly folderOpen: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M2.36064 15.1788C1.98502 13.2956 1.79721 12.354 2.33084 11.7159C2.36642 11.6734 2.40405 11.6323 2.44361 11.5927C3.03686 11 4.08674 11 6.1865 11H17.8135C19.9133 11 20.9631 11 21.5564 11.5927C21.5959 11.6323 21.6336 11.6734 21.6692 11.7159C22.2028 12.354 22.015 13.2956 21.6394 15.1788C21.0993 17.8865 20.8292 19.2404 19.8109 20.0721C19.7414 20.1288 19.6698 20.1833 19.5961 20.2354C18.5163 21 17.0068 21 13.9876 21H10.0124C6.99323 21 5.48367 21 4.40387 20.2354C4.33022 20.1833 4.2586 20.1288 4.18914 20.0721C3.17075 19.2404 2.90072 17.8865 2.36064 15.1788Z" stroke="currentColor" stroke-width="1.5" />
    <path d="M4 11V5.5C4 4.11929 5.11929 3 6.5 3H8.92963C9.59834 3 10.2228 3.3342 10.5937 3.8906L12 6M12 6H8.5M12 6H17.5C18.8807 6 20 7.11929 20 8.5V11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
</svg>`,
        url: ''
    } ;
    
    public static readonly folderAdd: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M13 21H12C7.28595 21 4.92893 21 3.46447 19.5355C2 18.0711 2 15.714 2 11V7.94427C2 6.1278 2 5.21956 2.38032 4.53806C2.65142 4.05227 3.05227 3.65142 3.53806 3.38032C4.21956 3 5.1278 3 6.94427 3C8.10802 3 8.6899 3 9.19926 3.19101C10.3622 3.62712 10.8418 4.68358 11.3666 5.73313L12 7M8 7H16.75C18.8567 7 19.91 7 20.6667 7.50559C20.9943 7.72447 21.2755 8.00572 21.4944 8.33329C21.9796 9.05942 21.9992 10.0588 22 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    <path d="M18 13V21M22 17H14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
</svg>`,
        url: ''
    } ;

    public static readonly projects: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M5.62195 20.1012L3.0462 11.8004C2.84628 11.1561 3.32023 10.5001 3.98567 10.5001H20.0143C20.6798 10.5001 21.1537 11.1561 20.9538 11.8004L18.3781 20.1012C18.1197 20.9338 17.3591 21.5001 16.4991 21.5001H7.50089C6.64091 21.5001 5.88032 20.9338 5.62195 20.1012Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
    <path d="M5 8V7.5C5 6.94772 5.44772 6.5 6 6.5H18C18.5523 6.5 19 6.94772 19 7.5V8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M7.5 4V3.5C7.5 2.94772 7.94772 2.5 8.5 2.5H15.5C16.0523 2.5 16.5 2.94772 16.5 3.5V4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
</svg>`,
        url: ''
    } ;

    public static readonly document: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M7.99976 7H15.9998" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M7.99976 11H11.9998" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M12.9955 22.0015H6C4.89421 22.0015 3.99828 21.1042 4 19.9984L4.02496 3.99688C4.02668 2.89353 4.92161 2 6.02496 2H17.9969C19.1014 2 19.9969 2.89543 19.9969 4V15.0145L12.9955 22.0015Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
    <path d="M20 15H15C13.8954 15 13 15.8954 13 17V22" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
</svg>`,
        url: ''
    } ;


    public static readonly documentCode: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M9.5 22.0015H5C3.89543 22.0015 3 21.106 3 20.0015V9.81661C3 9.28547 3.21128 8.77614 3.58724 8.40095L9.41585 2.58428C9.7908 2.21009 10.2989 1.99994 10.8286 1.99994H18C19.1046 1.99994 20 2.89537 20 3.99994V12.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M3 9.00195H8C9.10457 9.00195 10 8.10652 10 7.00195V2.00195" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
    <path d="M18 16L21 19.0026L18 22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M15 16L12 18.9845L15 22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
</svg>`,
        url: ''
    } ;

    public static readonly documentCsv: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M15 14H13.5C12.9477 14 12.5 14.4477 12.5 15V15.5C12.5 16.0523 12.9477 16.5 13.5 16.5H14C14.5523 16.5 15 16.9477 15 17.5V18C15 18.5523 14.5523 19 14 19H12.5M17.5 14L19.25 19L21 14M10 18C10 18.5523 9.55228 19 9 19H8C7.44772 19 7 18.5523 7 18V15C7 14.4477 7.44772 14 8 14H9C9.55228 14 10 14.4477 10 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M19 22H5C3.89543 22 3 21.1046 3 20L3 4C3 2.89543 3.89543 2 5 2H12L19 9V11M18.5 9H13.998C12.8935 9 11.998 8.10457 11.998 7V2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
</svg>`,
        url: ''
    } ;

    public static readonly documentDoc: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M21 15C21 14.4477 20.5523 14 20 14H19C18.4477 14 18 14.4477 18 15V18C18 18.5523 18.4477 19 19 19H20C20.5523 19 21 18.5523 21 18M7 14H8C9.10457 14 10 14.8954 10 16V17C10 18.1046 9.10457 19 8 19H7V14ZM13.5 14H14.5C15.0523 14 15.5 14.4477 15.5 15V18C15.5 18.5523 15.0523 19 14.5 19H13.5C12.9477 19 12.5 18.5523 12.5 18V15C12.5 14.4477 12.9477 14 13.5 14Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M19 22H5C3.89543 22 3 21.1046 3 20L3 4C3 2.89543 3.89543 2 5 2H12L19 9V11M18.5 9H13.998C12.8935 9 11.998 8.10457 11.998 7V2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
</svg>`,
        url: ''
    } ;

    public static readonly workflow: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M9 5C9 3.58579 9 2.87868 9.43934 2.43934C9.87868 2 10.5858 2 12 2C13.4142 2 14.1213 2 14.5607 2.43934C15 2.87868 15 3.58579 15 5C15 6.41421 15 7.12132 14.5607 7.56066C14.1213 8 13.4142 8 12 8C10.5858 8 9.87868 8 9.43934 7.56066C9 7.12132 9 6.41421 9 5Z" stroke="currentColor" stroke-width="1.5" />
    <path d="M2 19C2 17.5858 2 16.8787 2.43934 16.4393C2.87868 16 3.58579 16 5 16C6.41421 16 7.12132 16 7.56066 16.4393C8 16.8787 8 17.5858 8 19C8 20.4142 8 21.1213 7.56066 21.5607C7.12132 22 6.41421 22 5 22C3.58579 22 2.87868 22 2.43934 21.5607C2 21.1213 2 20.4142 2 19Z" stroke="currentColor" stroke-width="1.5" />
    <path d="M16 19C16 17.5858 16 16.8787 16.4393 16.4393C16.8787 16 17.5858 16 19 16C20.4142 16 21.1213 16 21.5607 16.4393C22 16.8787 22 17.5858 22 19C22 20.4142 22 21.1213 21.5607 21.5607C21.1213 22 20.4142 22 19 22C17.5858 22 16.8787 22 16.4393 21.5607C16 21.1213 16 20.4142 16 19Z" stroke="currentColor" stroke-width="1.5" />
    <path d="M12 8V9M12 9C12 9.93188 12 10.3978 12.1776 10.7654C12.4144 11.2554 12.8687 11.6448 13.4404 11.8478C13.8692 12 14.4128 12 15.5 12C16.5872 12 17.1308 12 17.5596 12.1522C18.1313 12.3552 18.5856 12.7446 18.8224 13.2346C19 13.6022 19 14.0681 19 15V16M12 9C12 9.93188 12 10.3978 11.8224 10.7654C11.5856 11.2554 11.1313 11.6448 10.5596 11.8478C10.1308 12 9.5872 12 8.5 12C7.4128 12 6.8692 12 6.44041 12.1522C5.86867 12.3552 5.41443 12.7446 5.17761 13.2346C5 13.6022 5 14.0681 5 15V16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
</svg>`,
        url: ''
    };
    
    public static readonly canvas: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M8 6H20C21.1046 6 22 6.89543 22 8V20C22 21.1046 21.1046 22 20 22H8C6.89543 22 6 21.1046 6 20V8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
    <path d="M2 6L4 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
    <path d="M6 2V4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
</svg>`,
        url: ''
    };
    
    public static readonly knowledge: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M15.5 7H8.5M12.499 11H8.49902" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M20 22H6C4.89543 22 4 21.1046 4 20M4 20C4 18.8954 4.89543 18 6 18H20V6C20 4.11438 20 3.17157 19.4142 2.58579C18.8284 2 17.8856 2 16 2H10C7.17157 2 5.75736 2 4.87868 2.87868C4 3.75736 4 5.17157 4 8V20Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M19.5 18C19.5 18 18.5 18.7628 18.5 20C18.5 21.2372 19.5 22 19.5 22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
</svg>`,
        url: ''
    };
    
    public static readonly idea: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M14.9061 17.4694C14.9655 17.1726 15.1583 16.922 15.4176 16.7659C17.2676 15.6519 18.5 13.8361 18.5 11.5C18.5 7.91015 15.5899 5 12 5C8.41015 5 5.5 7.91015 5.5 11.5C5.5 13.8361 6.73235 15.6519 8.58241 16.7659C8.84173 16.922 9.03452 17.1726 9.09388 17.4694L9.33922 18.6961C9.43271 19.1635 9.84312 19.5 10.3198 19.5H13.6802C14.1569 19.5 14.5673 19.1635 14.6608 18.6961L14.9061 17.4694Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
    <path d="M21 11.5H21.5M2.5 11.5H3M18.3633 5.13604L18.7168 4.78249M5 18.5L5.5 18M18.5 18L19 18.5M5.2832 4.78319L5.63676 5.13674M12 2.5V2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M14 19.5V21C14 21.5523 13.5523 22 13 22H11C10.4477 22 10 21.5523 10 21L10 19.5" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
</svg>`,
        url: ''
    };
    
    public static readonly planner: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M16.5 2V6M7.5 2V6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M3 10H21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
</svg>`,
        url: ''
    };
    
    public static readonly notes: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M17 2V4.5M12 2V4.5M7 2V4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M18.5 3.5H5.5C4.39543 3.5 3.5 4.39543 3.5 5.5V20C3.5 21.1046 4.39543 22 5.5 22L18.5 22C19.6046 22 20.5 21.1046 20.5 20V5.5C20.5 4.39543 19.6046 3.5 18.5 3.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
    <path d="M8.5 16H11.5M8.5 11H15.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
</svg>`,
        url: ''
    };
    
    public static readonly sidebarLeft: Icon = {
        svg:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M2 6V18C2 19.6569 3.34315 21 5 21H19C20.6569 21 22 19.6569 22 18V6C22 4.34315 20.6569 3 19 3H5C3.34315 3 2 4.34315 2 6Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M10 3V21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,
        url: ''};
    
    public static readonly sidebarLeftPointRight: Icon = {
        svg:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M2 6V18C2 19.6569 3.34315 21 5 21H19C20.6569 21 22 19.6569 22 18V6C22 4.34315 20.6569 3 19 3H5C3.34315 3 2 4.34315 2 6Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M10 3V21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M15 14L17 12L15 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,
        url: ''};
    
    public static readonly sidebarLeftPointLeft: Icon = {
        svg:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M2 6V18C2 19.6569 3.34315 21 5 21H19C20.6569 21 22 19.6569 22 18V6C22 4.34315 20.6569 3 19 3H5C3.34315 3 2 4.34315 2 6Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M10 3V21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M17 10L15 12L17 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,
        url: ''};
    
    public static readonly sidebarRight: Icon = {
        svg:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M19 3C20.6569 3 22 4.34315 22 6V18C22 19.6569 20.6569 21 19 21H5C3.34315 21 2 19.6569 2 18V6C2 4.34315 3.34315 3 5 3H19Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M14 3V21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,
        url: ''};
    
    public static readonly sidebarRightPointLeft: Icon = {
        svg:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M19 3C20.6569 3 22 4.34315 22 6V18C22 19.6569 20.6569 21 19 21H5C3.34315 21 2 19.6569 2 18V6C2 4.34315 3.34315 3 5 3H19Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M14 3V21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M9 14L7 12L9 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,
        url: ''};
    
    public static readonly sidebarRightPointRight: Icon = {
        svg:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M19 3C20.6569 3 22 4.34315 22 6V18C22 19.6569 20.6569 21 19 21H5C3.34315 21 2 19.6569 2 18V6C2 4.34315 3.34315 3 5 3H19Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M14 3V21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M7 10L9 12L7 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,
        url: ''};
    
    public static readonly chatAssistant: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M19 16V14C19 11.1716 19 9.75736 18.1213 8.87868C17.2426 8 15.8284 8 13 8H11C8.17157 8 6.75736 8 5.87868 8.87868C5 9.75736 5 11.1716 5 14V16C5 18.8284 5 20.2426 5.87868 21.1213C6.75736 22 8.17157 22 11 22H13C15.8284 22 17.2426 22 18.1213 21.1213C19 20.2426 19 18.8284 19 16Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
    <path d="M19 18C20.4142 18 21.1213 18 21.5607 17.5607C22 17.1213 22 16.4142 22 15C22 13.5858 22 12.8787 21.5607 12.4393C21.1213 12 20.4142 12 19 12" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
    <path d="M5 18C3.58579 18 2.87868 18 2.43934 17.5607C2 17.1213 2 16.4142 2 15C2 13.5858 2 12.8787 2.43934 12.4393C2.87868 12 3.58579 12 5 12" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
    <path d="M13.5 3.5C13.5 4.32843 12.8284 5 12 5C11.1716 5 10.5 4.32843 10.5 3.5C10.5 2.67157 11.1716 2 12 2C12.8284 2 13.5 2.67157 13.5 3.5Z" stroke="currentColor" stroke-width="1.5" />
    <path d="M12 5V8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M9 13V14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M15 13V14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M10 17.5C10 17.5 10.6667 18 12 18C13.3333 18 14 17.5 14 17.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
</svg>`,
        url: ''
    };
    
    public static readonly chatWebSearch: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" />
    <path d="M7.5 12C7.5 18 12 22 12 22C12 22 16.5 18 16.5 12C16.5 6 12 2 12 2C12 2 7.5 6 7.5 12Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
    <path d="M22 12L2 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
</svg>`,
        url: ''
    };
    
    public static readonly chatThink: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M12 19V5C12 3.34315 10.6569 2 9 2C7.34315 2 6 3.34315 6 5V6H5C3.34315 6 2 7.34315 2 9C2 10.6569 3.34315 12 5 12C3.34315 12 2 13.3431 2 15C2 16.6569 3.34315 18 5 18H6V19C6 20.6569 7.34315 22 9 22C10.6569 22 12 20.6569 12 19Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
    <path d="M12 19V5C12 3.34315 13.3431 2 15 2C16.6569 2 18 3.34315 18 5V6H19C20.6569 6 22 7.34315 22 9C22 10.6569 20.6569 12 19 12C20.6569 12 22 13.3431 22 15C22 16.6569 20.6569 18 19 18H18V19C18 20.6569 16.6569 22 15 22C13.3431 22 12 20.6569 12 19Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
</svg>`,
        url: ''
    };
    
    public static readonly chatAttachments: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M14 2H18C19.1046 2 20 2.89543 20 4V15.0145L12.9986 22.0015H6C4.89543 22.0015 4 21.1061 4 20.0015V13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M20 15H15C13.8954 15 13 15.8954 13 17V22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M4 8.23077V5.46154C4 3.54978 5.567 2 7.5 2C9.433 2 11 3.54978 11 5.46154V9.26923C11 10.2251 10.2165 11 9.25 11C8.2835 11 7.5 10.2251 7.5 9.26923V5.46154" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
</svg>`,
        url: ''
    };
    
    public static readonly chatSend: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M22.2119 2.73615C22.3006 2.46843 22.2317 2.17356 22.0334 1.97295C21.8352 1.77234 21.5412 1.69992 21.2724 1.78551L2.27241 7.83651C1.97497 7.93124 1.7673 8.20031 1.75103 8.51205C1.73475 8.82379 1.91328 9.11302 2.19925 9.2382L10.1996 12.7403L14.4705 8.46977L15.5311 9.53046L11.2403 13.821L14.5075 21.7845C14.6266 22.0747 14.9138 22.2602 15.2273 22.2493C15.5409 22.2385 15.8146 22.0336 15.9133 21.7358L22.2119 2.73615Z" fill="currentColor" />
</svg>`,
        url: ''
    };
    
    public static readonly arrowTop: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M18 15L12 9L6 15" stroke="currentColor" stroke-width="1.5" stroke-miterlimit="16"></path>
</svg>`,
        url: ''
    };
    
    public static readonly arrowRight: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M9.00005 6L15 12L9 18" stroke="currentColor" stroke-width="1.5" stroke-miterlimit="16" />
</svg>`,
        url: ''
    };
    
    public static readonly arrowDown: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M5.99977 9.00005L11.9998 15L17.9998 9" stroke="currentColor" stroke-width="1.5" stroke-miterlimit="16" stroke-linecap="round" stroke-linejoin="round"></path>
</svg>`,
        url: ''
    };
    
    public static readonly arrowLeft: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M15 6L9 12.0001L15 18" stroke="currentColor" stroke-width="1.5" stroke-miterlimit="16" stroke-linecap="round" stroke-linejoin="round"></path>
</svg>`,
        url: ''
    };
    
    public static readonly iconName: Icon = {
        svg:``,
        url: ''
    };
    
    static readonly chatTemp: Icon = {
        svg:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M15.7071 5.29289L17.5 3.5C17.8905 3.10948 18.5237 3.10948 18.9142 3.5L20.5 5.08579C20.8905 5.47631 20.8905 6.10947 20.5 6.5L18.7071 8.29289M15.7071 5.29289L9.59886 11.4012C9.34255 11.6575 9.16071 11.9787 9.07279 12.3303L8.20715 15.7929L11.6697 14.9272C12.0214 14.8393 12.3425 14.6575 12.5989 14.4012L18.7071 8.29289M15.7071 5.29289L18.7071 8.29289" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M10.7071 4.79289H5.20715C4.10258 4.79289 3.20715 5.68832 3.20715 6.79289V18.7929C3.20715 19.8975 4.10258 20.7929 5.20715 20.7929H17.2071C18.3117 20.7929 19.2071 19.8975 19.2071 18.7929V13.2929" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="4 3"/>
</svg>`,
        url: ''
    };

    static readonly viewList: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M8 3H5C3.89543 3 3 3.89543 3 5V8C3 9.10457 3.89543 10 5 10H8C9.10457 10 10 9.10457 10 8V5C10 3.89543 9.10457 3 8 3Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"></path>
    <path d="M8 14H5C3.89543 14 3 14.8954 3 16V19C3 20.1046 3.89543 21 5 21H8C9.10457 21 10 20.1046 10 19V16C10 14.8954 9.10457 14 8 14Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"></path>
    <path d="M15 4H21M15 9H21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
    <path d="M15 15H21M15 20H21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
</svg>`,
        url: ''
    };

    static readonly viewGrid: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M21.5 12L2.5 12M12 2.5V21.5" stroke="currentColor" stroke-width="1.5" />
    <path d="M5.5 21.5H18.5C20.1569 21.5 21.5 20.1569 21.5 18.5V5.5C21.5 3.84315 20.1569 2.5 18.5 2.5H5.5C3.84315 2.5 2.5 3.84315 2.5 5.5V18.5C2.5 20.1569 3.84315 21.5 5.5 21.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
</svg>`,
        url: ''
    };

    static readonly starEmpty: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M11.109 3.74829C11.48 3.02037 12.52 3.02037 12.891 3.74829L15.0785 8.0407C15.2237 8.32561 15.4964 8.5239 15.8122 8.5742L20.5671 9.33147C21.373 9.45983 21.6941 10.4474 21.1178 11.0252L17.7138 14.4383C17.4883 14.6644 17.3844 14.9846 17.4341 15.3001L18.1843 20.0635C18.3114 20.8702 17.4703 21.4808 16.7426 21.1102L12.4539 18.9254C12.1687 18.7801 11.8313 18.7801 11.5461 18.9254L7.25739 21.1102C6.52973 21.4808 5.68859 20.8702 5.81565 20.0635L6.56594 15.3001C6.61562 14.9846 6.51167 14.6644 6.28617 14.4383L2.88217 11.0252C2.3059 10.4474 2.62703 9.45983 3.43294 9.33147L8.18782 8.5742C8.50362 8.5239 8.77632 8.32561 8.92151 8.0407L11.109 3.74829Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
</svg>`,
        url: ''
    };

    static readonly starFull: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M10.6772 2.9544C11.3321 1.68187 13.1679 1.68187 13.8228 2.9544L16.0293 7.24233C16.0659 7.31348 16.1347 7.363 16.2143 7.37556L21.0106 8.13205C22.4332 8.35643 23.0001 10.0828 21.9828 11.093L18.5492 14.5025C18.4923 14.559 18.4661 14.6389 18.4787 14.7177L19.2355 19.4762C19.4598 20.8865 17.9749 21.9539 16.6905 21.3059L12.3645 19.1234C12.2926 19.0871 12.2074 19.0871 12.1355 19.1234L7.80953 21.3059C6.52505 21.9539 5.04024 20.8865 5.26453 19.4762L6.02134 14.7177C6.03387 14.6389 6.00766 14.559 5.95079 14.5025L2.51718 11.093C1.49993 10.0828 2.06681 8.35643 3.48941 8.13205L8.28567 7.37556C8.3653 7.363 8.43407 7.31348 8.47069 7.24233L10.6772 2.9544Z" fill="currentColor" />
</svg>`,
        url: ''
    };

    static readonly starHalf: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M14.8356 6.73297L15.2401 7.52662C15.3853 7.81154 15.658 8.00982 15.9738 8.06012L20.7287 8.8174C21.5346 8.94575 21.8557 9.9333 21.2794 10.5111L17.8754 13.9242C17.6499 14.1503 17.546 14.4705 17.5957 14.786L18.346 19.5494C18.473 20.3561 17.6319 20.9668 16.9042 20.5961L14.76 19.5038" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <path fill-rule="evenodd" clip-rule="evenodd" d="M10.737 2.62958C11.2858 1.55262 12.9116 1.94303 12.9116 3.15175V17.5672C12.9116 18.2253 12.5424 18.8278 11.9559 19.1265L7.75942 21.2644C6.48602 21.9131 5.01402 20.8445 5.23637 19.4328L5.98666 14.6693C5.99908 14.5904 5.97309 14.5104 5.91672 14.4538L2.51272 11.0407C1.50424 10.0296 2.06623 8.30134 3.47657 8.07673L8.23145 7.31945C8.3104 7.30688 8.37857 7.2573 8.41487 7.18608L10.737 2.62958Z" fill="currentColor" />
</svg>`,
        url: ''
    };

    static readonly starOff: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M18.5 14.1514L21.6178 11.0252C22.1941 10.4474 21.873 9.45984 21.0671 9.33149L16.3122 8.57421C15.9964 8.52392 15.7237 8.32563 15.5785 8.04072L13.391 3.74831C13.02 3.02039 11.98 3.02039 11.609 3.74831L10.4615 6.00002M9 8.52449L3.93294 9.33149C3.12703 9.45984 2.8059 10.4474 3.38217 11.0252L6.78617 14.4383C7.01167 14.6644 7.11562 14.9846 7.06594 15.3001L6.31565 20.0635C6.18859 20.8702 7.02973 21.4809 7.75739 21.1102L12.0461 18.9254C12.3313 18.7801 12.6687 18.7801 12.9539 18.9254L17.2426 21.1102C17.9703 21.4809 18.8114 20.8702 18.6843 20.0635L18.3593 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M2.5 2.00002L22.5 22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
</svg>`,
        url: ''
    };

    static readonly incognito: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M10 18C10 16.3431 8.65685 15 7 15C5.34315 15 4 16.3431 4 18C4 19.6569 5.34315 21 7 21C8.65685 21 10 19.6569 10 18Z" stroke="currentColor" stroke-width="1.5" />
    <path d="M20 18C20 16.3431 18.6569 15 17 15C15.3431 15 14 16.3431 14 18C14 19.6569 15.3431 21 17 21C18.6569 21 20 19.6569 20 18Z" stroke="currentColor" stroke-width="1.5" />
    <path d="M2 12H22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    <path d="M14.5 16.3411C13.9625 15.5328 13.0435 15 12 15C10.9565 15 10.0375 15.5328 9.5 16.3411" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    <path d="M3 11.9999L4.66166 5.70273C4.75853 5.33563 4.80697 5.15208 4.85375 5.02195C5.53545 3.12561 7.7632 2.40097 9.37283 3.552C9.48328 3.63099 9.6247 3.75279 9.90752 3.99638C10.0699 4.13626 10.1511 4.2062 10.2264 4.26322C11.2822 5.06309 12.7178 5.06309 13.7736 4.26322C13.8489 4.2062 13.9301 4.13626 14.0925 3.99638C14.3753 3.75279 14.5167 3.63099 14.6272 3.552C16.2368 2.40097 18.4645 3.12561 19.1463 5.02195C19.193 5.15208 19.2415 5.33563 19.3383 5.70273L21 11.9999H3Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
</svg>`,
        url: ''
    };

    static readonly stickyNote: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M20.5 14H16C14.8954 14 14 14.8954 14 16V20.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H14L21 14V5C21 3.89543 20.1046 3 19 3Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
</svg>`,
        url: ''
    };

    static readonly settingsDial: Icon = {
        svg:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M14 8C14 7.44772 14.4477 7 15 7H16C16.5523 7 17 7.44772 17 8V9C17 9.55228 16.5523 10 16 10H15C14.4477 10 14 9.55228 14 9V8Z" stroke="currentColor" stroke-width="1.5"/>
<path d="M7 15C7 14.4477 7.44772 14 8 14H9C9.55228 14 10 14.4477 10 15V16C10 16.5523 9.55228 17 9 17H8C7.44772 17 7 16.5523 7 16V15Z" stroke="currentColor" stroke-width="1.5"/>
<path d="M8.5 14V7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M15.5 10V16.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,
        url: ''
    };

    static readonly settingsDialBig: Icon = {
        svg:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M5 16.8C5 15.9163 5.71635 15.2 6.6 15.2H8.2C9.08365 15.2 9.8 15.9163 9.8 16.8V18.4C9.8 19.2837 9.08365 20 8.2 20H6.6C5.71635 20 5 19.2837 5 18.4V16.8Z" stroke="currentColor" stroke-width="1.5"/>
<path d="M7.40002 15.2V4.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M14 5.6C14 4.71635 14.7163 4 15.6 4H17.2C18.0837 4 18.8 4.71635 18.8 5.6V7.2C18.8 8.08365 18.0837 8.8 17.2 8.8H15.6C14.7163 8.8 14 8.08365 14 7.2V5.6Z" stroke="currentColor" stroke-width="1.5"/>
<path d="M16.4 8.8V19.2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,
        url: ''
    };

    static readonly chatEmpty: Icon = {
        svg:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 13.5759 2.40213 14.9412 3.06417 16.2246C3.32379 16.7279 3.40711 17.3096 3.24438 17.8521L2.53365 20.2212C2.3048 20.984 3.01602 21.6952 3.77882 21.4664L6.14794 20.7556C6.69036 20.5929 7.27207 20.6762 7.77536 20.9358C9.05879 21.5979 10.4241 22 12 22Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,
        url: ''
    };

    static readonly userGroup: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M16.5 19.5V18.7678C16.5 18.2735 16.326 17.786 15.9514 17.4635C14.8925 16.5517 13.5111 16 12 16C10.4889 16 9.10754 16.5517 8.04862 17.4635C7.67403 17.786 7.5 18.2735 7.5 18.7678V19.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <circle cx="12" cy="11" r="2.5" stroke="currentColor" stroke-width="1.5" />
    <path d="M17.5 11C18.8512 11 20.0858 11.5583 21.0292 12.4799C21.3542 12.7974 21.5 13.2476 21.5 13.7019V14.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <circle cx="17.5" cy="6.5" r="2" stroke="currentColor" stroke-width="1.5" />
    <path d="M6.5 11C5.1488 11 3.91423 11.5583 2.97079 12.4799C2.64576 12.7974 2.5 13.2476 2.5 13.7019V14.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <circle cx="6.5" cy="6.5" r="2" stroke="currentColor" stroke-width="1.5" />
</svg>`,
        url: ''
    };

    static readonly genspireLogo: Icon = {
        svg:`<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24"><defs><style>.cls-1{fill:#38bdf8;}.cls-2{fill:url(#linear-gradient);}.cls-3{fill:url(#linear-gradient-2);}.cls-4{fill:url(#linear-gradient-3);}.cls-5{fill:url(#linear-gradient-4);}.cls-6{fill:url(#linear-gradient-5);}</style><linearGradient id="linear-gradient" x1="12.75" y1="9.19" x2="19.33" y2="15.3" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#38bdf8" stop-opacity="0"/><stop offset="0.09" stop-color="#38bdf8" stop-opacity="0.04"/><stop offset="0.24" stop-color="#38bdf8" stop-opacity="0.15"/><stop offset="0.43" stop-color="#38bdf8" stop-opacity="0.33"/><stop offset="0.66" stop-color="#38bdf8" stop-opacity="0.58"/><stop offset="0.92" stop-color="#38bdf8" stop-opacity="0.89"/><stop offset="1" stop-color="#38bdf8"/></linearGradient><linearGradient id="linear-gradient-2" x1="11.99" y1="1.45" x2="17.91" y2="9.67" gradientUnits="userSpaceOnUse"><stop offset="0.21" stop-color="#38bdf8"/><stop offset="0.28" stop-color="#38bdf8" stop-opacity="0.88"/><stop offset="0.48" stop-color="#38bdf8" stop-opacity="0.57"/><stop offset="0.66" stop-color="#38bdf8" stop-opacity="0.33"/><stop offset="0.81" stop-color="#38bdf8" stop-opacity="0.15"/><stop offset="0.93" stop-color="#38bdf8" stop-opacity="0.04"/><stop offset="1" stop-color="#38bdf8" stop-opacity="0"/></linearGradient><linearGradient id="linear-gradient-3" x1="10.77" y1="4.23" x2="18.13" y2="7.39" xlink:href="#linear-gradient-2"/><linearGradient id="linear-gradient-4" x1="11.27" y1="4.96" x2="15.22" y2="5.76" xlink:href="#linear-gradient-2"/><linearGradient id="linear-gradient-5" x1="9.04" y1="5.22" x2="14.99" y2="5.22" xlink:href="#linear-gradient-2"/></defs><path class="cls-1" d="M19.56,15H12a3,3,0,0,1,0-6h0V1.45A10.55,10.55,0,1,0,22.12,15Z"/><path class="cls-2" d="M19.56,15v4.37a10.54,10.54,0,0,0,3-7.2c0-.06,0-.11,0-.17a3,3,0,0,0-3-3H12a3,3,0,0,0,0,6Z"/><path class="cls-3" d="M21.71,7.88a9.75,9.75,0,0,0-2.25-3.34A10.36,10.36,0,0,0,16,2.21h0A9.89,9.89,0,0,0,12,1.45V9h7.07Z"/><path class="cls-4" d="M21.71,7.88a9.75,9.75,0,0,0-2.25-3.34A10.36,10.36,0,0,0,16,2.21h0A9.89,9.89,0,0,0,12,1.45V9h7.07Z"/><path class="cls-5" d="M21.71,7.88a9.75,9.75,0,0,0-2.25-3.34A10.36,10.36,0,0,0,16,2.21h0A9.89,9.89,0,0,0,12,1.45V9h7.07Z"/><path class="cls-6" d="M12,1.45h0a10.61,10.61,0,0,0-3,.43V9h6V1.87A9.76,9.76,0,0,0,12,1.45Z"/></svg>`,
        url: ''
    };

    public static readonly thumbsUpStroke: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M2 12.5C2 11.3954 2.89543 10.5 4 10.5C5.65685 10.5 7 11.8431 7 13.5V17.5C7 19.1569 5.65685 20.5 4 20.5C2.89543 20.5 2 19.6046 2 18.5V12.5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
    <path d="M15.4787 7.80626L15.2124 8.66634C14.9942 9.37111 14.8851 9.72349 14.969 10.0018C15.0369 10.2269 15.1859 10.421 15.389 10.5487C15.64 10.7065 16.0197 10.7065 16.7791 10.7065H17.1831C19.7532 10.7065 21.0382 10.7065 21.6452 11.4673C21.7145 11.5542 21.7762 11.6467 21.8296 11.7437C22.2965 12.5921 21.7657 13.7351 20.704 16.0211C19.7297 18.1189 19.2425 19.1678 18.338 19.7852C18.2505 19.8449 18.1605 19.9013 18.0683 19.9541C17.116 20.5 15.9362 20.5 13.5764 20.5H13.0646C10.2057 20.5 8.77628 20.5 7.88814 19.6395C7 18.7789 7 17.3939 7 14.6239V13.6503C7 12.1946 7 11.4668 7.25834 10.8006C7.51668 10.1344 8.01135 9.58664 9.00069 8.49112L13.0921 3.96056C13.1947 3.84694 13.246 3.79012 13.2913 3.75075C13.7135 3.38328 14.3652 3.42464 14.7344 3.84235C14.774 3.8871 14.8172 3.94991 14.9036 4.07554C15.0388 4.27205 15.1064 4.37031 15.1654 4.46765C15.6928 5.33913 15.8524 6.37436 15.6108 7.35715C15.5838 7.46692 15.5488 7.5801 15.4787 7.80626Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
</svg>`,
        url: ''
    } ;

    public static readonly thumbsDownStroke: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M2 11.5C2 12.6046 2.89543 13.5 4 13.5C5.65685 13.5 7 12.1569 7 10.5V6.5C7 4.84315 5.65685 3.5 4 3.5C2.89543 3.5 2 4.39543 2 5.5V11.5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M15.4787 16.1937L15.2124 15.3337C14.9942 14.6289 14.8851 14.2765 14.969 13.9982C15.0369 13.7731 15.1859 13.579 15.389 13.4513C15.64 13.2935 16.0197 13.2935 16.7791 13.2935H17.1831C19.7532 13.2935 21.0382 13.2935 21.6452 12.5327C21.7145 12.4458 21.7762 12.3533 21.8296 12.2563C22.2965 11.4079 21.7657 10.2649 20.704 7.9789C19.7297 5.88111 19.2425 4.83222 18.338 4.21485C18.2505 4.15508 18.1605 4.0987 18.0683 4.04586C17.116 3.5 15.9362 3.5 13.5764 3.5H13.0646C10.2057 3.5 8.77628 3.5 7.88814 4.36053C7 5.22106 7 6.60607 7 9.37607V10.3497C7 11.8054 7 12.5332 7.25834 13.1994C7.51668 13.8656 8.01135 14.4134 9.00069 15.5089L13.0921 20.0394C13.1947 20.1531 13.246 20.2099 13.2913 20.2493C13.7135 20.6167 14.3652 20.5754 14.7344 20.1577C14.774 20.1129 14.8172 20.0501 14.9036 19.9245C15.0388 19.728 15.1064 19.6297 15.1654 19.5323C15.6928 18.6609 15.8524 17.6256 15.6108 16.6429C15.5838 16.5331 15.5488 16.4199 15.4787 16.1937Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
</svg>`,
        url: ''
    } ;

    public static readonly thumbsUpFilled: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M1.25 12.625C1.25 11.0372 2.49721 9.75003 4.03571 9.75003C6.08706 9.75003 7.75 11.4663 7.75 13.5834V17.4167C7.75 19.5338 6.08706 21.25 4.03571 21.25C2.49721 21.25 1.25 19.9628 1.25 18.375V12.625ZM4.03571 11.6667C3.52288 11.6667 3.10714 12.0958 3.10714 12.625V18.375C3.10714 18.9043 3.52288 19.3334 4.03571 19.3334C5.06139 19.3334 5.89286 18.4752 5.89286 17.4167V13.5834C5.89286 12.5248 5.06139 11.6667 4.03571 11.6667Z" fill="currentColor" />
    <path d="M12.799 3.18499C13.5298 2.54898 14.6525 2.61713 15.2964 3.34567C15.4097 3.48751 15.6704 3.83281 15.807 4.07931C16.4367 5.11969 16.6286 6.35887 16.3392 7.53622C16.3068 7.66781 16.2656 7.80085 16.2023 8.00546L15.9289 8.88818C15.8154 9.25476 15.7468 9.47927 15.7117 9.64734C15.6855 9.74004 15.6985 9.9283 15.9601 9.93979C16.1402 9.95585 16.8457 9.95655 17.2394 9.95655C18.4766 9.95653 19.4811 9.95651 20.2488 10.0581C21.0337 10.162 21.7462 10.3913 22.2315 10.9996C22.3273 11.1197 22.4127 11.2476 22.4867 11.3821C22.8663 12.0718 22.7859 12.8147 22.5573 13.5625C22.335 14.2901 21.9188 15.1861 21.409 16.2837C20.9359 17.3024 20.516 18.2066 20.1401 18.8407C19.7512 19.4967 19.3355 20.0124 18.7609 20.4046C18.0878 20.8641 17.1903 21.1044 16.4221 21.1783C15.6771 21.25 14.7621 21.25 13.6144 21.25C12.2303 21.25 10.5147 21.25 9.64051 21.1362C8.73584 21.0183 7.97376 20.7667 7.3663 20.1781C6.75553 19.5863 6.49136 18.8385 6.36819 17.9508C6.25001 17.0992 6.25003 16.0174 6.25005 14.6802L6.25003 13.5075C6.24964 12.1895 6.24939 11.3282 6.55913 10.5294C6.86812 9.73266 7.45104 9.08753 8.34723 8.09572L12.5574 3.43371C12.6369 3.34545 12.7182 3.25529 12.799 3.18499Z" fill="currentColor" />
</svg>`,
        url: ''
    } ;

    public static readonly thumbsDownFilled: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M1.25 11.375C1.25 12.9628 2.49721 14.25 4.03571 14.25C6.08706 14.25 7.75 12.5338 7.75 10.4167V6.58333C7.75 4.46624 6.08706 2.75 4.03571 2.75C2.49721 2.75 1.25 4.03718 1.25 5.625V11.375ZM4.03571 12.3333C3.52288 12.3333 3.10714 11.9043 3.10714 11.375V5.625C3.10714 5.09573 3.52288 4.66667 4.03571 4.66667C5.06139 4.66667 5.89286 5.52479 5.89286 6.58333V10.4167C5.89286 11.4752 5.06139 12.3333 4.03571 12.3333Z" fill="currentColor" />
    <path d="M12.799 20.815C13.5298 21.4511 14.6525 21.3829 15.2964 20.6544C15.4097 20.5125 15.6704 20.1672 15.807 19.9207C16.4367 18.8803 16.6286 17.6412 16.3392 16.4638C16.3068 16.3322 16.2656 16.1992 16.2023 15.9946L15.9289 15.1118C15.8154 14.7453 15.7468 14.5208 15.7117 14.3527C15.6855 14.26 15.6985 14.0717 15.9601 14.0602C16.1402 14.0442 16.8457 14.0435 17.2394 14.0435C18.4766 14.0435 19.4811 14.0435 20.2488 13.9419C21.0337 13.838 21.7462 13.6087 22.2315 13.0005C22.3273 12.8804 22.4127 12.7524 22.4867 12.618C22.8663 11.9283 22.7859 11.1853 22.5573 10.4375C22.335 9.70996 21.9188 8.81395 21.409 7.71633C20.9359 6.6976 20.516 5.79345 20.1401 5.15929C19.7512 4.5033 19.3355 3.98759 18.7609 3.5954C18.0878 3.13597 17.1903 2.89563 16.4221 2.8217C15.6771 2.75 14.7621 2.75001 13.6144 2.75002C12.2303 2.75 10.5147 2.74998 9.64051 2.86387C8.73584 2.98172 7.97376 3.23334 7.3663 3.82191C6.75553 4.4137 6.49136 5.16154 6.36819 6.04919C6.25001 6.90085 6.25003 7.98266 6.25005 9.31985L6.25003 10.4925C6.24964 11.8105 6.24939 12.6719 6.55913 13.4706C6.86812 14.2674 7.45104 14.9125 8.34723 15.9043L12.5574 20.5663C12.6369 20.6546 12.7182 20.7447 12.799 20.815Z" fill="currentColor" />
</svg>`,
        url: ''
    } ;

    public static readonly speaker: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M14 14.8135V9.18646C14 6.04126 14 4.46866 13.0747 4.0773C12.1494 3.68593 11.0603 4.79793 8.88232 7.02192C7.75439 8.17365 7.11085 8.42869 5.50604 8.42869C4.10257 8.42869 3.40084 8.42869 2.89675 8.77262C1.85035 9.48655 2.00852 10.882 2.00852 12C2.00852 13.118 1.85035 14.5134 2.89675 15.2274C3.40084 15.5713 4.10257 15.5713 5.50604 15.5713C7.11085 15.5713 7.75439 15.8264 8.88232 16.9781C11.0603 19.2021 12.1494 20.3141 13.0747 19.9227C14 19.5313 14 17.9587 14 14.8135Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M17 9C17.6254 9.81968 18 10.8634 18 12C18 13.1366 17.6254 14.1803 17 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M20 7C21.2508 8.36613 22 10.1057 22 12C22 13.8943 21.2508 15.6339 20 17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
</svg>`,
        url: ''
    } ;

    public static readonly share: Icon = {
        svg:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M3 17C3 17.9299 3 18.3949 3.10222 18.7764C3.37962 19.8117 4.18827 20.6203 5.22354 20.8977C5.60504 21 6.07003 21 7 21H17C17.93 21 18.395 21 18.7765 20.8977C19.8117 20.6203 20.6204 19.8117 20.8978 18.7764C21 18.3949 21 17.9299 21 17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M16.5 7.4999C16.5 7.4999 13.1858 3 12 3C10.8141 3 7.5 7.5 7.5 7.5M12 4V16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,
        url: ''
    } ;

    public static readonly refresh: Icon = {
        svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M11.75 2.95455C6.8924 2.95455 2.95455 6.8924 2.95455 11.75C2.95455 16.6076 6.8924 20.5455 11.75 20.5455C16.6076 20.5455 20.5455 16.6076 20.5455 11.75C20.5455 11.2103 20.983 10.7727 21.5227 10.7727C22.0625 10.7727 22.5 11.2103 22.5 11.75C22.5 17.6871 17.6871 22.5 11.75 22.5C5.81294 22.5 1 17.6871 1 11.75C1 5.81294 5.81294 1 11.75 1C14.3494 1 16.7334 1.92319 18.5916 3.45792V1.97727C18.5916 1.43754 19.0292 1 19.5689 1C20.1086 1 20.5462 1.43754 20.5462 1.97727V5.88636C20.5462 6.30688 20.2772 6.68025 19.8783 6.81337C19.4794 6.9465 19.0401 6.80952 18.7875 6.47329C17.1812 4.33477 14.6269 2.95455 11.75 2.95455Z" fill="currentColor" />
</svg>`,
        url: ''
    } ;
}