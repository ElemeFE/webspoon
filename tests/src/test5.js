onload = function() {
  if(/^dist\/dist5\.js$/.test('dist/dist5.js')) throw 'rev 没有成功';
  var h1 = document.createElement('h1');
  h1.textContent = 'WebSpoon';
  h1.style.color = 'red';
  document.body.appendChild(h1);
}
