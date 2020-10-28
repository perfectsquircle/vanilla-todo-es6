/* global VT */
window.VT = window.VT || {};

VT.AppIcon = el => {
  if (el.children.length > 0) return;

  const id = el.getAttribute('data-id');
  let promise = VT.AppIcon.cache[id];

  if (!promise) {
    const url = `${VT.AppIcon.baseUrl + id}.svg`;
    promise = VT.AppIcon.cache[id] = fetch(url).then(r => r.text());
  }

  promise.then(svg => {
    el.innerHTML = el.classList.contains('-double') ? svg + svg : svg;
  });
};

VT.AppIcon.baseUrl =
  'https://rawcdn.githack.com/primer/octicons/ff7f6eee63fa2f2d24d02e3aa76a87db48e4b6f6/icons/';
VT.AppIcon.cache = {};
