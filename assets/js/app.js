class Canvas {
  constructor(canvas, mode = '2d') {
    this.canvas = canvas;
    this.context = this.canvas.getContext(mode);
    this.context.font = '30px Arial';
    this.components = {};
  }

  addComponent(component) {
    this.components[component.getId()] = component;
    return this;
  }

  removeComponentById(componentId) {
    delete this.components[componentId];
  }

  getComponentById(id) {
    if (this.components.hasOwnProperty(id)) {
      return this.components[id];
    }
    return this;
  }

  componentExists(id) {
    return this.components.hasOwnProperty(id);
  }

  getContext() {
    return this.context;
  }

  render(clearingFirst = true) {
    if (clearingFirst) {
      this.clear();
    }

    for (let id in this.components) {
      if (this.components.hasOwnProperty(id)) {
        let component = this.components[id];
        if (component.hidden) continue;
        if (component instanceof CanvasRect) {
          this.context.fillStyle = component.getColor();
          this.context.fillRect(component.getX(), component.getY(), component.getWidth(), component.getHeight());
        } else if (component instanceof CanvasImg) {
          this.context.drawImage(
            component.getImgElem(),
            component.getX(),
            component.getY(),
            component.getWidth(),
            component.getHeight()
          );
        } else if (component instanceof CanvasAnimation) {
          this.context.drawImage(
            component.source.image,
            component.source.x,
            component.source.y,
            component.source.width,
            component.source.height,
            component.getX(),
            component.getY(),
            component.getWidth(),
            component.getHeight()
          );
        } else if (component instanceof CanvasText) {
          this.context.font = component.font;
          this.context.fillStyle = component.style;
          this.context.fillText(component.text, component.x, component.y);
        }
      }
    }
  }

  clearComponents(componentsIds) {
    for (let idIdx in componentsIds) {
      let id = componentsIds[idIdx];
      this.removeComponentById(id);
    }
  }

  clearAllComponents(exceptions = []) {
    for (let cIdx in this.components) {
      if (Game.inArray(cIdx, exceptions)) continue;
      this.removeComponentById(cIdx);
    }
  }

  clear() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

class CanvasComponent {
  constructor(id, x, y, width, height) {
    this.id = id;
    this.width = width;
    this.height = height;
    this.x = x;
    this.y = y;
  }

  getId() {
    return this.id;
  }

  getWidth() {
    return this.width;
  }

  getHeight() {
    return this.height;
  }

  getX() {
    return this.x;
  }

  getY() {
    return this.y;
  }

  collisionCheck(x, y, range) {
    return x > this.x - range && x < this.x + range && y > this.y - range && y < this.y + range;
  }
}

class CanvasText extends CanvasComponent {
  constructor(id, x, y, text, font = '20px Arial', style = 'black', width = 20, height = 20) {
    super(id, x, y, width, height);
    this.font = font;
    this.text = text;
    this.style = style;
  }
}

class HitBox extends CanvasComponent {
  constructor(x, y, width = 0, height = 0) {
    super('hitbox', x, y, width, height);
  }
}

class CanvasRect extends CanvasComponent {
  constructor(id, x, y, width, height, color = 'black') {
    super(id, x, y, width, height);
    this.color = color;
  }

  getColor() {
    return this.color;
  }
}

class CanvasImg extends CanvasComponent {
  constructor(id, x, y, width, height, imgSrc, hidden = false) {
    super(id, x, y, width, height);
    this.imgSrc = imgSrc instanceof Image ? imgSrc.src : imgSrc;
    this.imgElem = imgSrc instanceof Image ? imgSrc : this.createImgElemFromSrc();
    this.hidden = hidden;
  }

  createImgElemFromSrc() {
    let img = document.createElement('IMG');
    img.setAttribute('src', this.imgSrc);
    img.setAttribute('width', this.width);
    img.setAttribute('height', this.height);
    return img;
  }

  getImgElem() {
    return this.imgElem;
  }

  getImgSrc() {
    return this.imgSrc;
  }

  setImgSrc(imgSrc) {
    this.imgSrc = imgSrc instanceof Image ? imgSrc.src : imgSrc;
    this.imgElem = imgSrc instanceof Image ? imgSrc : this.createImgElemFromSrc();
  }
}

class CanvasAnimation extends CanvasComponent {
  constructor(id, x, y, width, height, imgSrc, sourceX, sourceY, sourceWidth, sourceHeight) {
    super(id, x, y, width, height);
    this.imgSrc = imgSrc instanceof Image ? imgSrc.src : imgSrc;
    this.imgElem = imgSrc instanceof Image ? imgSrc : this.createImgElemFromSrc();
    this.source = { x: sourceX, y: sourceY, width: sourceWidth, height: sourceHeight, image: this.imgElem };
    this.originalSource = { x: sourceX, y: sourceY, width: sourceWidth, height: sourceHeight, image: this.imgElem };
  }

  createImgElemFromSrc() {
    let img = document.createElement('IMG');
    img.setAttribute('src', this.imgSrc);
    img.setAttribute('width', this.width);
    img.setAttribute('height', this.height);
    return img;
  }

  getImgElem() {
    return this.imgElem;
  }

  getImgSrc() {
    return this.imgSrc;
  }

  setImgSrc(imgSrc) {
    this.imgSrc = imgSrc instanceof Image ? imgSrc.src : imgSrc;
    this.imgElem = imgSrc instanceof Image ? imgSrc : this.createImgElemFromSrc();
  }
}

class ExplosionFragment extends CanvasImg {
  constructor(bomb, x, y, horizontal = true, timeout = 1000) {
    let xMultiple = bomb.player.nearestMultiple(x),
      yMultiple = bomb.player.nearestMultiple(y),
      generatedId = 'bombFrag' + bomb.player.game.position(xMultiple, yMultiple),
      fragmentImg = horizontal
        ? bomb.player.game.images.bombExplosionHorizontal.element
        : bomb.player.game.images.bombExplosionVertical.element;
    super(generatedId, xMultiple, yMultiple, bomb.player.game.blockSize, bomb.player.game.blockSize, fragmentImg);
    this.game = bomb.player.game;
    this.player = bomb.player;
    this.bomb = bomb;
    this.timeout = timeout;
    this.nextFragment = null;
    this.timeoutId = -1;
  }

  arm() {
    this.timeoutId = window.setTimeout(() => this.game.removeComponentById(this.id), this.timeout);
  }

  append(fragment) {
    if (this.nextFragment instanceof ExplosionFragment) {
      return this.nextFragment.append(fragment);
    }
    return (this.nextFragment = fragment);
  }

  flushTimeout(evenTheCurrentOne = true) {
    if (evenTheCurrentOne) window.clearTimeout(this.timeoutId);
    if (this.nextFragment instanceof ExplosionFragment) {
      this.nextFragment.flushTimeout();
    }
  }
}

class Bomb extends CanvasImg {
  constructor(player, x, y, range, timeout = 3000, blowTimeout = 1000) {
    let xRounded = player.nearestMultiple(x),
      yRounded = player.nearestMultiple(y),
      generatedId = 'bomb' + player.game.position(xRounded, yRounded) + '_' + Date.now();
    super(
      generatedId,
      xRounded,
      yRounded,
      player.game.blockSize,
      player.game.blockSize,
      player.game.images.bomb.element
    );
    this.game = player.game;
    this.player = player;
    this.range = range;
    this.timeout = timeout;
    this.blowTimeout = blowTimeout;
    this.blowTimeoutId = -1;
    this.canBeMoved = false;
    this.blows = false;
    this.moving = false;
    this.movingTimeoutId = -1;
    this.walkSpeed = 6;
    this.explosion = {
      left: null,
      up: null,
      right: null,
      down: null,
    };
  }

  stopMoving() {
    this.moving = false;
    window.clearTimeout(this.movingTimeoutId);
  }

  move(direction, horizontal) {
    let x = this.x,
      y = this.y;

    if (horizontal) {
      x += direction * this.walkSpeed;
    } else {
      y += direction * this.walkSpeed;
    }

    let isWalkable = this.game.isWalkable(x, y);
    if (!isWalkable) {
      return (this.moving = false);
    }

    this.moving = true;
    this.x = x;
    this.y = y;

    this.movingTimeoutId = window.setTimeout(() => {
      this.move(direction, horizontal);
    }, 20);
  }

  arm() {
    this.timeoutId = setTimeout(() => this.blow(), this.timeout);
  }

  blow() {
    window.clearTimeout(this.timeoutId);
    this.stopMoving();
    this.setImgSrc(this.game.images.bombExplosionCenter.element);
    this.blows = true;
    this.linkFragments();
    this.checkCenterCollision();

    this.blowTimeoutId = window.setTimeout(() => {
      Game.removeFromArray(this.id, this.game.map.firedBombs);
      this.game.removeComponentById(this.id);
      this.player.bombs++;
    }, this.blowTimeout);
  }

  linkFragments() {
    for (let r = 1; r <= this.range; r++) {
      this.appendExplosionFragment(this.createExplosionFragment(-1, r), 'left');
      this.appendExplosionFragment(this.createExplosionFragment(1, r), 'right');
      this.appendExplosionFragment(this.createExplosionFragment(-1, r, false), 'up');
      this.appendExplosionFragment(this.createExplosionFragment(1, r, false), 'down');
    }
    this.cutExplosionTails();
  }

  appendExplosionFragment(fragment, direction) {
    if (!(fragment instanceof ExplosionFragment)) {
      return fragment;
    }

    if (this.explosion[direction] instanceof ExplosionFragment) {
      return this.explosion[direction].append(fragment);
    }

    return (this.explosion[direction] = fragment);
  }

  createExplosionFragment(direction, centreDistance = 1, horizontal = true) {
    let gameSize = this.game.size,
      distance = centreDistance * this.game.blockSize,
      x = this.x,
      y = this.y;

    if (horizontal) {
      x = this.x + distance * direction;
    } else {
      y = this.y + distance * direction;
    }

    if (!(x >= 0 && x < gameSize && y >= 0 && y < gameSize)) {
      return null;
    }

    return new ExplosionFragment(this, x, y, horizontal);
  }

  cutExplosionTails() {
    this.iterateExplosion((fragment) => {
      let colliding = this.collidingEffect(fragment.x, fragment.y);
      if (colliding.stopsHere) {
        fragment.nextFragment = null;
        return;
      }

      if (colliding.canBlow) {
        this.game.addComponent(fragment);
        fragment.arm();
      }
    });
  }

  collidingEffect(x, y) {
    for (let coordIndex in this.game.map.iceBlocks) {
      let pos = this.game.map.iceBlocks[coordIndex],
        blockCoords = this.game.coords(pos),
        hitbox = new HitBox(blockCoords.x, blockCoords.y);

      if (hitbox.collisionCheck(x, y, this.game.blockSize)) {
        return { collides: true, stopsHere: true, canBlow: false };
      }
    }

    for (let coordIndex in this.game.map.blocks) {
      let pos = this.game.map.blocks[coordIndex],
        blockCoords = this.game.coords(pos),
        hitbox = new HitBox(blockCoords.x, blockCoords.y);

      if (hitbox.collisionCheck(x, y, this.game.blockSize)) {
        Game.removeFromArray(pos, this.game.map.blocks);
        this.game.removeComponentById(pos);
        return { collides: true, stopsHere: true, canBlow: true };
      }
    }

    for (let playerIdx in this.game.players) {
      let player = this.game.players[playerIdx];
      if (player.collisionCheck(x, y, this.game.blockSize)) {
        this.game.playerDies(player, this);
        return { collides: true, stopsHere: false, canBlow: true };
      }
    }

    for (let fbIdx in this.game.map.firedBombs) {
      let bombId = this.game.map.firedBombs[fbIdx],
        bomb = this.game.getComponentById(bombId);
      if (bombId !== this.id && bomb.collisionCheck(x, y, this.game.blockSize) && !bomb.blows) {
        bomb.blow();
        return { collides: true, stopsHere: false, canBlow: true };
      }
    }

    return { collides: false, stopsHere: false, canBlow: true };
  }

  explosionCollisionCheck(x, y) {
    if (!this.blows) {
      return false;
    }

    let colliding = this.collisionCheck(x, y, this.game.blockSize);
    if (colliding) return true;

    this.iterateExplosion((fragment) => {
      if (fragment.collisionCheck(x, y, this.game.blockSize)) {
        colliding = true;
      }
    });

    return colliding;
  }

  checkCenterCollision() {
    for (let playerIdx in this.game.players) {
      let player = this.game.players[playerIdx];
      if (player.collisionCheck(this.x, this.y, this.game.blockSize)) {
        this.game.playerDies(player, this);
        return { collides: true, canBlow: true };
      }
    }
  }

  iterateExplosion(callable = (fragment) => {}) {
    for (let direction in this.explosion) {
      let arm = this.explosion[direction];
      if (arm instanceof ExplosionFragment) {
        let fragment = arm;
        while (fragment instanceof ExplosionFragment) {
          callable(fragment);
          fragment = fragment.nextFragment;
        }
      }
    }
  }

  flushTimeout() {
    window.clearTimeout(this.timeoutId);
    window.clearTimeout(this.blowTimeoutId);
    window.clearTimeout(this.movingTimeoutId);
    if (this.explosion.left instanceof ExplosionFragment) this.explosion.left.flushTimeout();
    if (this.explosion.up instanceof ExplosionFragment) this.explosion.up.flushTimeout();
    if (this.explosion.right instanceof ExplosionFragment) this.explosion.right.flushTimeout();
    if (this.explosion.down instanceof ExplosionFragment) this.explosion.down.flushTimeout();
  }
}

class Player extends CanvasAnimation {
  constructor(
    game,
    id,
    x,
    y,
    width,
    height,
    imgSrc,
    sX,
    sY,
    sW,
    sH,
    lives = 1,
    speed = 1,
    range = 1,
    bombs = 1,
    bombSpeed = 0,
    bombTimeout = 3000
  ) {
    super(id, x, y, width, height, imgSrc, sX, sY, sW, sH);
    this.game = game;
    this.lives = lives;
    this.speed = speed;
    this.range = range;
    this.bombs = bombs;
    this.bombTimeout = bombTimeout;
    this.bombSpeed = bombSpeed;
    this.setBombWheelsTimeoutId = -1;
    this.keyControls = Player.controls()[id];
    this.frames = 3;
    this.currentFrame = 1;
    this.dead = false;
    this.score = 0;
  }

  static fromPlayer(player, overrideProps = {}) {
    const p = new Player(
      overrideProps.game || player.game,
      overrideProps.id || player.id,
      overrideProps.x || player.x,
      overrideProps.y || player.y,
      overrideProps.width || player.width,
      overrideProps.height || player.height,
      overrideProps.imgSrc || player.imgSrc,
      overrideProps.sX || player.originalSource.x,
      overrideProps.sY || player.originalSource.y,
      overrideProps.sW || player.originalSource.width,
      overrideProps.sH || player.originalSource.height,
      overrideProps.lives || player.lives,
      overrideProps.speed || player.speed,
      overrideProps.range || player.range,
      overrideProps.bombs || player.bombs,
      overrideProps.bombSpeed || player.bombSpeed,
      overrideProps.bombTimeout || player.bombTimeout
    );

    Object.assign(p, overrideProps);

    return p;
  }

  dies() {
    this.currentFrame = 1;
    this.setImgSrc(this.game.images.skull.element);
    this.source = { x: 0, y: 0, width: 136, height: 156, image: this.imgElem };
    this.dead = true;
    this.game.drawPlayerResources(this);
  }

  wins() {
    this.score++;
  }

  run(keys) {
    this.attack(keys);
    this.move(keys);
    this.game.drawPlayerResources(this);
  }

  attack(keys) {
    if (keys[this.keyControls.attack] && this.bombs && !this.dead) {
      let bomb = new Bomb(this, this.x, this.y, this.range, this.bombTimeout);
      if (this.game.setBomb(bomb)) {
        this.bombs--;
        this.setBombWheels(bomb);
      }
    }
  }

  setBombWheels(bomb) {
    let collision = this.collisionCheck(bomb.x, bomb.y, this.game.blockSize);
    if (!collision || bomb.blows) {
      return (bomb.canBeMoved = true);
    }
    this.setBombWheelsTimeoutId = window.setTimeout(() => this.setBombWheels(bomb), 250);
  }

  animate(keys) {
    if (keys[this.keyControls.down]) this.source.y = 0;
    if (keys[this.keyControls.left]) this.source.y = 32;
    if (keys[this.keyControls.right]) this.source.y = 64;
    if (keys[this.keyControls.up]) this.source.y = 96;

    if (this.frames === this.currentFrame) {
      this.currentFrame = 1;
      this.source.x = this.originalSource.x;
    } else {
      this.source.x += this.source.width;
    }
    this.currentFrame++;
  }

  move(keys) {
    if (this.dead) return;

    let x = this.x,
      y = this.y,
      originalX = this.x,
      originalY = this.y;

    if (keys[this.keyControls.left]) {
      x -= this.speed + 3;
    }
    if (keys[this.keyControls.right]) {
      x += this.speed + 3;
    }
    if (!this.game.isWalkable(x, y)) y = this.nearestMultiple(y, [1, 3, 5, 7, 9, 11]);
    if (this.game.isWalkable(x, y)) {
      this.x = x;
      this.y = y;
    }
    if (keys[this.keyControls.up]) {
      y -= this.speed + 3;
    }
    if (keys[this.keyControls.down]) {
      y += this.speed + 3;
    }
    if (!this.game.isWalkable(x, y)) x = this.nearestMultiple(x, [1, 3, 5, 7, 9, 11]);
    if (this.game.isWalkable(x, y)) {
      this.x = x;
      this.y = y;
    }

    if (
      keys[this.keyControls.left] ||
      keys[this.keyControls.up] ||
      keys[this.keyControls.right] ||
      keys[this.keyControls.down]
    ) {
      this.animate(keys);
      this.collidingEffect(originalX, originalY, keys);
    }
  }

  collidingEffect(originalX, originalY, keys) {
    for (let fbIdx in this.game.map.firedBombs) {
      let bomb = this.game.getComponentById(this.game.map.firedBombs[fbIdx]);

      if (!bomb.blows && bomb.canBeMoved && this.collisionCheck(bomb.x, bomb.y, this.game.blockSize)) {
        bomb.stopMoving();

        if (this.bombSpeed > 0) {
          if (this.x === bomb.x) {
            if (this.y > bomb.y && keys[this.keyControls.up]) {
              bomb.move(-1, false);
            } else if (this.y < bomb.y && keys[this.keyControls.down]) {
              bomb.move(1, false);
            }
          } else if (this.y === bomb.y) {
            if (this.x > bomb.x && keys[this.keyControls.left]) {
              bomb.move(-1, true);
            } else if (this.x < bomb.x && keys[this.keyControls.right]) {
              bomb.move(1, true);
            }
          }
        }

        this.x = originalX;
        this.y = originalY;
      }

      if (bomb.blows && bomb.explosionCollisionCheck(this.x, this.y)) {
        return this.game.playerDies(this, bomb);
      }
    }

    let pUps = this.game.map.powerUps;
    for (let puIdx in pUps) {
      if (puIdx === 'limits') continue;
      let pUp = pUps[puIdx];
      for (let puLocIdx in pUp) {
        let puLocId = 'pu' + pUp[puLocIdx],
          pu = this.game.getComponentById(puLocId);

        if (this.collisionCheck(pu.x, pu.y, this.game.blockSize)) {
          this.game.removeComponentById(puLocId);
          Game.removeFromArray(pu, pUp);
          switch (pu.imgElem) {
            case this.game.images.puBomb.element:
              this.bombs++;
              break;
            case this.game.images.puRange.element:
              this.range++;
              break;
            case this.game.images.puSpeed.element:
              this.speed++;
              break;
            case this.game.images.puWalkBombs.element:
              this.bombSpeed++;
              break;
          }
        }
      }
    }
  }

  nearestMultiple(n, forbiddenMultiples = []) {
    if (n < 0) n = 0;
    let factor = n / this.game.blockSize;
    let multipleIndex = Math.round(factor);
    if (Game.inArray(multipleIndex, forbiddenMultiples)) {
      if (factor < multipleIndex) multipleIndex--;
      else multipleIndex++;
    }
    return multipleIndex * this.game.blockSize;
  }

  static controls() {
    return {
      p1: { left: 37, up: 38, right: 39, down: 40, attack: 13 },
      p2: { left: 65, up: 87, right: 68, down: 83, attack: 9 },
      p3: { left: 70, up: 84, right: 72, down: 71, attack: 82 },
      p4: { left: 74, up: 73, right: 76, down: 75, attack: 85 },
    };
  }
}

class Game extends Canvas {
  constructor(
    canvas,
    leftCanvas,
    leftBottomCanvas,
    rightCanvas,
    rightBottomCanvas,
    numPlayers = 2,
    size = 780,
    nrRows = 13,
    mode = '2d'
  ) {
    super(canvas, mode);
    this.leftCanvas = new Canvas(leftCanvas);
    this.leftBottomCanvas = new Canvas(leftBottomCanvas);
    this.rightCanvas = new Canvas(rightCanvas);
    this.rightBottomCanvas = new Canvas(rightBottomCanvas);
    this.size = size;
    this.nrRows = nrRows;
    this.blockSize = this.size / this.nrRows;
    this.numPlayers = numPlayers;
    this.players = [];
    this.loaded = false;
    this.playersCanvasAssoc = {
      p1: this.leftCanvas,
      p2: this.rightBottomCanvas,
      p3: this.rightCanvas,
      p4: this.leftBottomCanvas,
    };
    this.images = {
      gameover: { src: 'assets/img/gameOver.png', element: null },
      skull: { src: 'assets/img/skull.png', element: null },
      bomb: { src: 'assets/img/bomb.png', element: null },
      bombExplosionCenter: { src: 'assets/img/bombExplosionCenter.png', element: null },
      bombExplosionVertical: { src: 'assets/img/bombExplosionVertical.png', element: null },
      bombExplosionHorizontal: { src: 'assets/img/bombExplosionHorizontal.png', element: null },
      ice: { src: 'assets/img/ice.JPG', element: null },
      iceBlock: { src: 'assets/img/iceBlock.JPG', element: null },
      players: { src: 'assets/img/players.png', element: null },
      p1: { src: 'assets/img/P1.JPG', element: null },
      p2: { src: 'assets/img/P2.JPG', element: null },
      p3: { src: 'assets/img/P3.JPG', element: null },
      p4: { src: 'assets/img/P4.JPG', element: null },
      puBomb: { src: 'assets/img/puBomb.JPG', element: null },
      puRange: { src: 'assets/img/puRange.JPG', element: null },
      puSpeed: { src: 'assets/img/puSpeed.JPG', element: null },
      puWalkBombs: { src: 'assets/img/puWalkBombs.JPG', element: null },
      background: { src: 'assets/img/background.jpg', element: null },
    };
    this.map = {
      locked: ['A1', 'A2', 'B1', 'L13', 'M12', 'M13', 'A12', 'A13', 'B13', 'L1', 'M1', 'M2'],
      iceBlocks: [
        'B2',
        'D2',
        'F2',
        'H2',
        'J2',
        'L2',
        'B4',
        'D4',
        'F4',
        'H4',
        'J4',
        'L4',
        'B6',
        'D6',
        'F6',
        'H6',
        'J6',
        'L6',
        'B8',
        'D8',
        'F8',
        'H8',
        'J8',
        'L8',
        'B10',
        'D10',
        'F10',
        'H10',
        'J10',
        'L10',
        'B12',
        'D12',
        'F12',
        'H12',
        'J12',
        'L12',
      ],
      blocks: [],
      powerUps: {
        limits: { bombs: 8, ranges: 4, speed: 5, bombSpeed: 5 },
        bombs: [],
        ranges: [],
        speed: [],
        bombSpeed: [],
      },
      firedBombs: [],
    };
    this.loadImages();
  }

  initializeTexts() {
    (() => {
      const canvasWidth = this.leftCanvas.canvas.width;
      const canvasHeight = this.leftCanvas.canvas.height;
      const quarterHeight = canvasHeight / 4 - 2;
      this.clearPlayerCanvasAllComponents();
      let y = 2;
      for (let pIdx in this.players) {
        const player = this.players[pIdx];
        const pId = player.getId();
        const canvas = this.playersCanvasAssoc[pId];
        canvas.addComponent(new CanvasRect('background', 0, 0, canvasWidth, canvasHeight, '#89a8c3'));
        canvas.addComponent(new CanvasText('plus', 45, 105, '+', '100px Arial', '#cad4dc'));
        canvas.addComponent(
          Player.fromPlayer(player, {
            x: 0,
            y,
            width: quarterHeight - 4,
            height: quarterHeight - 4,
          })
        );
        canvas.addComponent(
          new CanvasImg(
            pId + 'Bomb',
            quarterHeight,
            y,
            quarterHeight - 4,
            quarterHeight - 4,
            this.images.puBomb.element,
            !player.bombs
          )
        );
        canvas.addComponent(
          new CanvasImg(
            pId + 'Speed',
            quarterHeight * 2,
            y,
            quarterHeight - 4,
            quarterHeight - 4,
            this.images.puSpeed.element,
            !player.speed
          )
        );
        canvas.addComponent(
          new CanvasImg(
            pId + 'Range',
            quarterHeight * 3,
            y,
            quarterHeight - 4,
            quarterHeight - 4,
            this.images.puRange.element,
            !player.range
          )
        );
        canvas.addComponent(
          new CanvasImg(
            pId + 'WalkBombs',
            quarterHeight * 4,
            y,
            quarterHeight - 4,
            quarterHeight - 4,
            this.images.puWalkBombs.element,
            !player.bombSpeed
          )
        );
        canvas.addComponent(new CanvasText(pId + 'bombs', quarterHeight + 16, y + 13, '', '16px Impact', 'black'));
        canvas.addComponent(new CanvasText(pId + 'speed', quarterHeight * 2 + 16, y + 13, '', '16px Impact', 'black'));
        canvas.addComponent(new CanvasText(pId + 'range', quarterHeight * 3 + 16, y + 13, '', '16px Impact', 'black'));
        canvas.addComponent(
          new CanvasText(pId + 'bombSpeed', quarterHeight * 4 + 16, y + 13, '', '16px Impact', 'black')
        );
        canvas.addComponent(new CanvasText(pId + 'score', quarterHeight - 14, y + 13, '', '16px Impact', 'white'));
        canvas.addComponent(new CanvasText(pId + 'code', 50, 120, player.code, '16px Impact', 'black'));

        // y += quarterHeight;
      }
    })();

    this.leftCanvas.render();
    this.leftBottomCanvas.render();
    this.rightCanvas.render();
    this.rightBottomCanvas.render();
  }

  createImgElemFromSrc(src, width = this.blockSize, height = this.blockSize) {
    let img = document.createElement('IMG');
    img.setAttribute('src', src);
    img.setAttribute('width', width);
    img.setAttribute('height', height);
    return img;
  }

  loadImages() {
    let numOfImages = Object.keys(this.images).length,
      game = this,
      imgs = [];

    Object.keys(game.images).map(function (imageIdx) {
      if (imageIdx === 'imagesLoaded') return imageIdx;
      let src = game.images[imageIdx].src,
        img = game.createImgElemFromSrc(src);

      img.onload = function () {
        game.images[imageIdx].element = img;
        imgs.push(img);
        if (imgs.length >= numOfImages) {
          game.loaded = true;
        }
      };
    });
  }

  setBomb(bomb) {
    let collision = false;
    for (let bIdx in this.map.firedBombs) {
      let bombId = this.map.firedBombs[bIdx],
        bombTmp = this.getComponentById(bombId);

      if (bomb.collisionCheck(bombTmp.x, bombTmp.y, this.blockSize)) {
        collision = true;
        break;
      }
    }

    if (!collision) {
      const bId = bomb.getId();
      bomb.id = bId;
      this.map.firedBombs.push(bId);
      this.addComponent(bomb);
      bomb.arm();
      return true;
    }

    return false;
  }

  clearPlayerCanvasAllComponents() {
    this.leftCanvas.clearAllComponents();
    this.rightCanvas.clearAllComponents();
    this.rightBottomCanvas.clearAllComponents();
    this.leftBottomCanvas.clearAllComponents();
  }

  start() {
    if (!this.loaded) {
      return console.log('Game not loaded yet.');
    }
    let playersValue = parseInt(document.getElementById('players').value);
    this.numPlayers = playersValue >= 1 && playersValue <= 4 ? playersValue : 2;
    this.addComponent(new CanvasImg('background', 0, 0, this.size, this.size, this.images.background.element));
    this.clearLevel();
    this.generatePlayers();
    this.generateLevel();
    this.drawMap();
    this.initializeTexts();
    this.render();
  }

  clearLevel() {
    this.clearAllComponents(['background'].concat(this.map.iceBlocks));
  }

  run(keys) {
    for (let pIdx in this.players) {
      let player = this.players[pIdx];
      player.run(keys);
    }
    this.render();
  }

  static generateId(length = 4) {
    let result = '';
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  generatePlayers() {
    let lastPlayers = {
      p1: { score: 0, code: Game.generateId() },
      p2: { score: 0, code: Game.generateId() },
      p3: { score: 0, code: Game.generateId() },
      p4: { score: 0, code: Game.generateId() },
    };
    for (let pIdx in this.players) {
      let player = this.players[pIdx];
      lastPlayers[player.getId()].score = player.score;
      lastPlayers[player.getId()].code = player.code;
    }
    this.players = {};
    this.players.p1 = new Player(
      this,
      'p1',
      this.coords('A1').x,
      this.coords('A1').y,
      this.blockSize,
      this.blockSize,
      this.images.players.element,
      0,
      0,
      32,
      32
    );
    this.players.p1.score = lastPlayers.p1.score;
    this.players.p1.code = lastPlayers.p1.code;
    Game.generateId();

    if (this.numPlayers > 1) {
      this.players.p2 = new Player(
        this,
        'p2',
        this.coords('M13').x,
        this.coords('M13').y,
        this.blockSize,
        this.blockSize,
        this.images.players.element,
        96,
        0,
        32,
        32
      );
      this.players.p2.score = lastPlayers.p2.score;
      this.players.p2.code = lastPlayers.p2.code;
    }
    if (this.numPlayers > 2) {
      this.players.p3 = new Player(
        this,
        'p3',
        this.coords('M1').x,
        this.coords('M1').y,
        this.blockSize,
        this.blockSize,
        this.images.players.element,
        192,
        0,
        32,
        32
      );
      this.players.p3.score = lastPlayers.p3.score;
      this.players.p3.code = lastPlayers.p3.code;
    }
    if (this.numPlayers > 3) {
      this.players.p4 = new Player(
        this,
        'p4',
        this.coords('A13').x,
        this.coords('A13').y,
        this.blockSize,
        this.blockSize,
        this.images.players.element,
        288,
        0,
        32,
        32
      );
      this.players.p4.score = lastPlayers.p4.score;
      this.players.p4.code = lastPlayers.p4.code;
    }
  }

  generateLevel() {
    this.map.blocks = [];
    this.map.firedBombs = [];
    this.map.powerUps.bombs = [];
    this.map.powerUps.ranges = [];
    this.map.powerUps.speed = [];
    this.map.powerUps.bombSpeed = [];
    let numOfBlocks = this.nrRows * this.nrRows,
      numOfBlocksToGenerate = Math.floor(numOfBlocks * 0.5),
      alphabet = 'ABCDEFGHIJKLMNOPQRSTUVXYZ',
      usedBlocks = this.map.blocks.concat(this.map.iceBlocks).concat(this.map.locked);

    while (this.map.blocks.length < numOfBlocksToGenerate) {
      let xPos = alphabet[Game.randomNum(0, this.nrRows)],
        yPos = Game.randomNum(1, this.nrRows),
        loc = xPos + yPos;

      if (!Game.inArray(loc, usedBlocks)) {
        usedBlocks.push(loc);
        this.map.blocks.push(loc);
        this.generatePowerUp(loc);
      }
    }

    return this.map.blocks;
  }

  generatePowerUp(location) {
    let powerUps = ['bombs', 'ranges', 'speed', 'bombSpeed'];
    if (this.map.powerUps.bombs.length >= this.map.powerUps.limits.bombs) Game.removeFromArray('bombs', powerUps);
    if (this.map.powerUps.ranges.length >= this.map.powerUps.limits.ranges) Game.removeFromArray('ranges', powerUps);
    if (this.map.powerUps.speed.length >= this.map.powerUps.limits.speed) Game.removeFromArray('speed', powerUps);
    if (this.map.powerUps.bombSpeed.length >= this.map.powerUps.limits.bombSpeed)
      Game.removeFromArray('bombSpeed', powerUps);

    if (!powerUps.length) return;
    let rand = Game.randomNum(0, powerUps.length);
    this.map.powerUps[powerUps[rand]].push(location);
  }

  drawMap() {
    this.drawPlayers();
    this.drawPowerUps();
    this.draw('', this.images.iceBlock.element, this.map.iceBlocks);
    this.draw('', this.images.ice.element, this.map.blocks);
  }

  drawLines() {
    for (let i = this.blockSize; i < this.size; i += this.blockSize) {
      let line = new CanvasRect('l' + i, 0, i, this.size, 1);
      let column = new CanvasRect('c' + i, i, 0, 1, this.size);
      this.addComponent(line);
      this.addComponent(column);
    }
  }

  drawPlayers() {
    for (let pIdx in this.players) {
      let player = this.players[pIdx];
      this.addComponent(player);
    }
  }

  drawPlayerResources(player) {
    const pId = player.getId();
    const canvas = this.playersCanvasAssoc[pId];
    canvas.getComponentById(pId + 'score').text = player.score > 0 ? player.score : '';
    canvas.getComponentById(pId + 'bombs').text = player.bombs > 1 ? player.bombs : '';
    canvas.getComponentById(pId + 'range').text = player.range > 1 ? player.range : '';
    canvas.getComponentById(pId + 'speed').text = player.speed > 1 ? player.speed : '';
    canvas.getComponentById(pId + 'Bomb').hidden = player.bombs < 1;
    canvas.getComponentById(pId + 'Range').hidden = player.range < 1;
    canvas.getComponentById(pId + 'Speed').hidden = player.speed < 1;
    canvas.getComponentById(pId + 'WalkBombs').hidden = player.bombSpeed < 1;

    canvas.render();
  }

  drawPowerUps() {
    this.draw('pu', this.images.puBomb.element, this.map.powerUps.bombs);
    this.draw('pu', this.images.puRange.element, this.map.powerUps.ranges);
    this.draw('pu', this.images.puSpeed.element, this.map.powerUps.speed);
    this.draw('pu', this.images.puWalkBombs.element, this.map.powerUps.bombSpeed);
  }

  draw(prefix, imgSrc, positions) {
    for (let strPosIndex in positions) {
      let strPos = positions[strPosIndex];
      let coords = this.coords(strPos);
      let element = new CanvasImg(prefix + strPos, coords.x, coords.y, this.blockSize, this.blockSize, imgSrc);
      this.addComponent(element);
    }
  }

  isWalkable(x, y) {
    if (x < 0 || y < 0 || x > this.size - this.blockSize || y > this.size - this.blockSize) return false;
    let unwalkableBlocks = this.map.blocks.concat(this.map.iceBlocks);
    for (let coordIndex in unwalkableBlocks) {
      let blockCoords = this.coords(unwalkableBlocks[coordIndex]);
      let hitbox = new HitBox(blockCoords.x, blockCoords.y);
      if (hitbox.collisionCheck(x, y, this.blockSize)) {
        return false;
      }
    }
    return true;
  }

  getPlayersAsArray() {
    return Object.values(this.players);
  }

  getPlayersAliveAsArray() {
    return this.getPlayersAsArray().filter((p) => !p.dead);
  }

  playerWins(player) {
    player.score++;
  }

  playerDies(player) {
    player.dies();
    const playersAlive = this.getPlayersAliveAsArray();
    const pId = player.getId();
    const playerCanvas = this.playersCanvasAssoc[pId] || this.leftCanvas;
    const playerComponent = playerCanvas.getComponentById(pId);
    playerCanvas.clearComponents([
      pId,
      pId + 'Bomb',
      pId + 'Speed',
      pId + 'Range',
      pId + 'WalkBombs',
      pId + 'bombs',
      pId + 'speed',
      pId + 'range',
      pId + 'bombSpeed',
    ]);
    playerCanvas.addComponent(
      Player.fromPlayer(playerComponent, {
        imgSrc: this.images.skull.element,
        sX: 12,
        sY: 0,
        sW: 136,
        sH: 156,
      })
    );

    if (playersAlive.length < 2) {
      playersAlive[0].wins();
      window.setTimeout(() => Game.flushAllTimeouts(), 50);
    }
  }

  coords(strPos) {
    strPos = strPos.toUpperCase();
    let alphabet = 'ABCDEFGHIJKLMNOPQRSTUVXYZ';
    return { x: alphabet.indexOf(strPos[0]) * this.blockSize, y: (strPos.substr(1) - 1) * this.blockSize };
  }

  position(x, y) {
    let alphabet = 'ABCDEFGHIJKLMNOPQRSTUVXYZ',
      xRounded = this.nearestMultiple(x),
      yRounded = this.nearestMultiple(y);
    return alphabet[xRounded / this.blockSize] + yRounded / this.blockSize;
  }

  nearestMultiple(n, forbiddenMultiples = []) {
    if (n < 0) n = 0;
    let factor = n / this.blockSize;
    let multipleIndex = Math.round(factor);
    if (Game.inArray(multipleIndex, forbiddenMultiples)) {
      if (factor < multipleIndex) multipleIndex--;
      else multipleIndex++;
    }
    return multipleIndex * this.blockSize;
  }

  static flushAllTimeouts() {
    let lastTimeoutId = window.setTimeout(() => {}, 1000);
    while (lastTimeoutId) {
      window.clearTimeout(lastTimeoutId);
      lastTimeoutId--;
    }
  }

  static removeFromArray(val, array) {
    let index = array.indexOf(val);
    if (index > -1) {
      array.splice(index, 1);
    }
    return array;
  }

  static inArray(val, array) {
    return array.indexOf(val) !== -1;
  }

  static randomNum(min = 1, max = 100) {
    return Math.floor(Math.random() * max) + min;
  }

  static createImgElemFromSrc(imgSrc, width, height) {
    let img = document.createElement('IMG');
    img.setAttribute('src', imgSrc);
    img.setAttribute('width', width);
    img.setAttribute('height', height);
    return img;
  }
}
