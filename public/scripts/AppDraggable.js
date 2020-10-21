/* global VT */
window.VT = window.VT || {};

VT.AppDraggable = function (el, options) {
  var dragThreshold = options.dragThreshold || 5;
  var dropRange = options.dropRange || 50;
  var dropRangeSquared = dropRange * dropRange;

  var originX, originY;
  var clientX, clientY;
  var dragging = false;
  var clicked = false;
  var data;
  var image;
  var imageSource;
  var imageX, imageY;
  var currentTarget;

  if (window.navigator.pointerEnabled) {
    el.addEventListener('pointerdown', start);
  } else if (window.navigator.msPointerEnabled) {
    el.addEventListener('MSPointerDown', start);
  } else {
    el.addEventListener('mousedown', start);
    el.addEventListener('touchstart', start);
  }

  // maybe prevent click
  el.addEventListener(
    'click',
    function (e) {
      if (dragging || clicked) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    true
  );

  function start(e) {
    if (el.classList.contains('_nodrag')) return;
    if (e.type === 'mousedown' && e.button !== 0) return;

    e.preventDefault();

    var p = getPositionHost(e);
    clientX = originX = p.clientX || p.pageX;
    clientY = originY = p.clientY || p.pageY;

    if (window.navigator.pointerEnabled) {
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', end);
    } else if (window.navigator.msPointerEnabled) {
      el.addEventListener('MSPointerMove', move);
      el.addEventListener('MSPointerUp', end);
    } else {
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', end);
      el.addEventListener('touchmove', move);
      el.addEventListener('touchend', end);
    }
  }

  function move(e) {
    e.preventDefault();

    var p = getPositionHost(e);
    clientX = p.clientX || p.pageX;
    clientY = p.clientY || p.pageY;

    if (dragging) return;

    var deltaX = clientX - originX;
    var deltaY = clientY - originY;

    if (Math.abs(deltaX) < dragThreshold && Math.abs(deltaY) < dragThreshold) {
      return;
    }

    dispatchStart();
    dispatchLoop();
    dispatchOver();
  }

  function end(e) {
    e.preventDefault();
    e.stopImmediatePropagation();

    if (!dragging) {
      e.target.click();
      clicked = true;
    }

    requestAnimationFrame(function () {
      dragging = false;
      clicked = false;

      if (window.navigator.pointerEnabled) {
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerup', end);
      } else if (window.navigator.msPointerEnabled) {
        el.removeEventListener('MSPointerMove', move);
        el.removeEventListener('MSPointerUp', end);
      } else {
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseup', end);
        el.removeEventListener('touchmove', move);
        el.removeEventListener('touchend', end);
      }
    });
  }

  //

  function dispatchStart() {
    dragging = true;
    data = {};

    setImage(el);

    el.dispatchEvent(
      new CustomEvent('draggableStart', {
        detail: buildDetail(),
        bubbles: true,
      })
    );
  }

  function dispatchLoop() {
    dispatchDrag();
    dispatchTarget();

    if (dragging) {
      requestAnimationFrame(dispatchLoop);
    } else {
      dispatchEnd();
    }
  }

  function dispatchDrag() {
    image.dispatchEvent(
      new CustomEvent('draggableDrag', {
        detail: buildDetail(),
        bubbles: true,
      })
    );
  }

  function dispatchTarget() {
    var nextTarget = getTarget();

    if (nextTarget === currentTarget) return;

    if (currentTarget) {
      currentTarget.addEventListener('draggableLeave', removeDropClassOnce);
      currentTarget.dispatchEvent(
        new CustomEvent('draggableLeave', {
          detail: buildDetail(),
          bubbles: true,
        })
      );
    }

    if (nextTarget) {
      nextTarget.addEventListener('draggableEnter', addDropClassOnce);
      nextTarget.dispatchEvent(
        new CustomEvent('draggableEnter', {
          detail: buildDetail(),
          bubbles: true,
        })
      );
    }

    currentTarget = nextTarget;
  }

  function dispatchEnd() {
    if (currentTarget) {
      currentTarget.addEventListener('draggableDrop', cleanUpOnce);
      currentTarget.dispatchEvent(
        new CustomEvent('draggableDrop', {
          detail: buildDetail(),
          bubbles: true,
        })
      );
    } else {
      image.dispatchEvent(
        new CustomEvent('draggableCancel', {
          detail: buildDetail(),
          bubbles: true,
        })
      );
    }
  }

  function dispatchOver() {
    if (!dragging) return;

    if (currentTarget) {
      currentTarget.dispatchEvent(
        new CustomEvent('draggableOver', {
          detail: buildDetail(),
          bubbles: true,
        })
      );
    }

    setTimeout(dispatchOver, 50);
  }

  //

  function buildDetail() {
    var detail = {
      el: el,
      data: data,
      image: image,
      imageSource: imageSource,
      originX: originX,
      originY: originY,
      clientX: clientX,
      clientY: clientY,
      imageX: imageX,
      imageY: imageY,
      setImage: function (source) {
        setImage(source);
        detail.image = image;
      },
    };

    return detail;
  }

  function setImage(source) {
    if (imageSource === source) return;
    imageSource = source;

    removeImage();

    image = imageSource.cloneNode(true);
    image.style.position = 'fixed';
    image.style.left = '0';
    image.style.top = '0';
    image.style.width = imageSource.offsetWidth + 'px';
    image.style.height = imageSource.offsetHeight + 'px';
    image.style.margin = '0';
    image.style.zIndex = 9999;
    image.classList.add('-dragging');

    var rect = source.getBoundingClientRect();
    imageX = originX - rect.left;
    imageY = originY - rect.top;

    image.addEventListener('draggableDrag', function (e) {
      var x = e.detail.clientX - e.detail.imageX;
      var y = e.detail.clientY - e.detail.imageY;
      image.style.transition = 'none';
      image.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
    });

    image.addEventListener('draggableCancel', cleanUp);

    document.body.appendChild(image);
  }

  function addDropClassOnce(e) {
    e.target.removeEventListener(e.type, addDropClassOnce);
    e.target.classList.add('-drop');
  }

  function removeDropClassOnce(e) {
    e.target.removeEventListener(e.type, addDropClassOnce);
    e.target.classList.remove('-drop');
  }

  function cleanUpOnce(e) {
    e.target.removeEventListener(e.type, cleanUpOnce);
    cleanUp();
  }

  function cleanUp() {
    if (currentTarget) {
      currentTarget.classList.remove('-drop');
    }

    removeImage();

    data = null;
    image = null;
    imageSource = null;
    currentTarget = null;
  }

  function removeImage() {
    if (image && image.parentNode) {
      image.parentNode.removeChild(image);
    }
  }

  function getTarget() {
    var candidates = [];

    document.querySelectorAll(options.dropSelector).forEach(function (el) {
      var rect = el.getBoundingClientRect();
      var distanceSquared = pointDistanceToRectSquared(clientX, clientY, rect);

      if (distanceSquared > dropRangeSquared) return;

      candidates.push({
        el: el,
        distance2: distanceSquared,
      });
    });

    candidates.sort(function (a, b) {
      if (a.distance2 === 0 && b.distance2 === 0) {
        // in this case, the client position is inside both rectangles
        // if A contains B, B is the correct target and vice versa
        // TODO sort by z-index somehow?
        return a.el.contains(b.el) ? -1 : b.el.contains(a.el) ? 1 : 0;
      }

      // sort by distance, ascending
      return a.distance2 - b.distance2;
    });

    return candidates.length > 0 ? candidates[0].el : null;
  }

  function pointDistanceToRectSquared(x, y, rect) {
    var dx =
      x < rect.left ? x - rect.left : x > rect.right ? x - rect.right : 0;
    var dy =
      y < rect.top ? y - rect.top : y > rect.bottom ? y - rect.bottom : 0;

    return dx * dx + dy * dy;
  }

  function getPositionHost(e) {
    if (e.targetTouches && e.targetTouches.length > 0) {
      return e.targetTouches[0];
    }

    if (e.changedTouches && e.changedTouches.length > 0) {
      return e.changedTouches[0];
    }

    return e;
  }
};