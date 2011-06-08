module.exports = [
  from: '/static/*'
  to: 'static/*'
,
  from: '/'
  to: '_show/welcome'
,
  from: '/item/:id'
  to: '_show/item/:id'
,
  from: '/relation/:id'
  to: '_show/relation/:id'
,
  from: '*'
  to: '_show/not_found'
]
