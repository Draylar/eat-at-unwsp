# eat@unwsp

eat@unwsp is a simple and intuitive café menu site for students at UNWSP. It is built with NodeJS for the backend and your standard suite on the front-end. 

Students can use the tool to easily see the menu for each day, or view the menu for days in the future/past. The backend also exposes several API calls for other applications to work with, if needed.

![](/resources/landing.png)

## For Developers

eat@unwsp provides the following routes under `/api/`:

---

### Request

`GET /api/menu`

### URL parameters

**Required**:

`date=YYYY-MM-DD`

**Optional**:

`primary[true/false]`, defaults to true

**Example**:

`curl --location --request GET '[...]/api/menu?date=2021-01-01&primary=false'`
