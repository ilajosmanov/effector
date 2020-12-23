import {allSettled, combine, createDomain, fork, serialize} from 'effector'

it('serialize stores to object of sid as keys', () => {
  const app = createDomain()
  const $a = app.createStore('value', {sid: 'a'})
  const $b = app.createStore([], {sid: 'b'})
  const $c = app.createStore(null, {sid: 'c'})
  const $d = app.createStore(false, {sid: 'd'})

  const scope = fork(app)
  const values = serialize(scope)

  expect(values).toMatchInlineSnapshot(`
    Object {
      "a": "value",
      "b": Array [],
      "c": null,
      "d": false,
    }
  `)
})

it('serialize stores with ignore parameter', () => {
  const app = createDomain()
  const $a = app.createStore('value', {sid: 'a'})
  const $b = app.createStore([], {sid: 'b'})
  const $c = app.createStore(null, {sid: 'c'})
  const $d = app.createStore(false, {sid: 'd'})

  const scope = fork(app)
  const values = serialize(scope, {ignore: [$b, $d]})

  expect(values).toMatchInlineSnapshot(`
    Object {
      "a": "value",
      "c": null,
    }
  `)
})

it('serialize stores in nested domain', () => {
  const app = createDomain()
  const first = app.createDomain()
  const second = app.createDomain()
  const third = second.createDomain()
  const $a = first.createStore('value', {sid: 'a'})
  const $b = second.createStore([], {sid: 'b'})
  const $c = third.createStore(null, {sid: 'c'})
  const $d = app.createStore(false, {sid: 'd'})

  const scope = fork(app)
  const values = serialize(scope, {ignore: [$d, $a]})

  expect(values).toMatchInlineSnapshot(`
    Object {
      "b": Array [],
      "c": null,
    }
`)
})

describe('onlyChanges', () => {
  it('avoid serializing combined stores when they are not changed', async () => {
    const app = createDomain()
    const newMessage = app.createEvent()
    const messages = app.createStore(0).on(newMessage, x => x + 1)
    const stats = combine({messages})
    const scope = fork(app)
    expect(serialize(scope, {onlyChanges: true})).toMatchInlineSnapshot(`
      Object {
        "r5bjo6": Object {
          "messages": 0,
        },
      }
    `)
    await allSettled(newMessage, {scope})
    expect(serialize(scope, {onlyChanges: true})).toMatchInlineSnapshot(`
      Object {
        "-vaq9x0": 1,
        "r5bjo6": Object {
          "messages": 1,
        },
      }
    `)
  })
  it('skip unchanged objects', async () => {
    const app = createDomain()
    const newMessage = app.createEvent()
    const messages = app.createStore(0).on(newMessage, x => x + 1)
    const scope = fork(app)
    expect(serialize(scope, {onlyChanges: true})).toMatchInlineSnapshot(
      `Object {}`,
    )
    await allSettled(newMessage, {scope})
    expect(serialize(scope, {onlyChanges: true})).toMatchInlineSnapshot(`
      Object {
        "-gmbzoz": 1,
      }
    `)
  })

  it('keep store in serialization when it returns to default state', async () => {
    const app = createDomain()
    const newMessage = app.createEvent()
    const resetMessages = app.createEvent()
    const messages = app
      .createStore(0)
      .on(newMessage, x => x + 1)
      .reset(resetMessages)
    const scope = fork(app)
    await allSettled(newMessage, {scope})
    await allSettled(resetMessages, {scope})
    expect(serialize(scope, {onlyChanges: true})).toMatchInlineSnapshot(
      `Object {}`,
    )
  })
})
