# Easy Stay Web (Mobile H5)

## Run

```bash
cd /Users/mac/Desktop/easy-stay-hotel/apps/web
python3 -m http.server 5174
```

Open: `http://localhost:5174`

## API Base

Default API base: `http://localhost:3000`

To switch base URL in browser console:

```js
localStorage.setItem('easy_stay_api_base', 'http://localhost:3000');
location.reload();
```

## Implemented Pages

- Home (`#/home`)
- Search (`#/search`)
- Results + sort/filter/location/price sheets (`#/results`)
- Hotel detail + review summary + date sheet (`#/hotel/:id`)
- Room offers (`#/rooms/:hotelId`)
- Checkout + submit booking (`#/checkout/:hotelId/:roomId`)

## Public APIs Used

- `GET /hotels/featured`
- `GET /hotels/suggestions`
- `GET /hotels`
- `GET /hotels/:id`
- `GET /hotels/:id/reviews-summary`
- `GET /hotels/:id/offers`
- `GET /hotels/:id/calendar`
- `POST /bookings`
