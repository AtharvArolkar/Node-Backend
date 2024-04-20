# Learn backend series

# Generate .gitignore

- https://mrkandreev.name/snippets/gitignore-generator/#Node

## Install nodemon to watch

whenever connecting with db always use try catch, and dont forget to use async await

app.use is used for middleware

highwer order fucntion

bcrypt help-s tp hash password

jwt is a bearer token
bearer token: anyone send me this token, ill send the data

console logged request body, request files and cloudinary response
![No Image](./public/temp/image.png)

### Refresh token : Long lived token

    - Used to refresh the access token. If token expires, the user has to manually login, and get himself authenticated.

### Access token : Short lived token

    - If we have access token, no need to authroise the user. If it expires,user receives a 401 request, so on frontend, the devloper need to add one more codee, to make the user hit a url automatically, by sending the refresh topken, stored in a session storage, thereby getting a new access token.
