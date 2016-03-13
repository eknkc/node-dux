# dux

Immutable redux helpers

## usage

```js
import { createAction, createReducer, combineReucers } from "@eknkc/dux"

let setTitle = createAction("setTitle");

let reducers = createReducer({ title: "" }, {
  [setTitle.type]: (state, action) => state.set('name', action.payload)
})

let combined = combineReducers({
  post: reducers
})
```
