class PlayScene extends Phaser.Scene {
    constructor() {
        super('PlayScene');
    }

    preload() {
        // Load all assets with the correct, visually confirmed 128x128 frame size.
        this.load.image('boss_arena', 'map_assets/boss_arena.png');
        this.load.spritesheet('idle', 'Idle.png', { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('walk', 'Walk.png', { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('run', 'Run.png', { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('melee', 'Melee.png', { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('rolling', 'Rolling.png', { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('take-damage', 'TakeDamage.png', { frameWidth: 128, frameHeight: 128 });
    }

    create() {
        // --- Map ---
        const map = this.add.image(0, 0, 'boss_arena').setOrigin(0);
        this.physics.world.setBounds(0, 0, map.width, map.height);

        // --- Input & Properties ---
        this.keys = this.input.keyboard.createCursorKeys();
        this.keys.space = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.keys.m = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
        this.keys.r = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
        this.walkSpeed = 200;
        this.runSpeed = 350;
        this.rollSpeed = 400;
        this.facing = 's'; // Default facing direction

        // --- Animations ---
        // This order MUST match the sprite sheet layout and the user's explicit direction mapping.
        // Ensure that this order is unchanged at all times: ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'];
        const directions = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'];
        const framesPerRow = 15;
        directions.forEach((direction, index) => {
            const startFrame = index * framesPerRow;
            
            this.anims.create({
                key: `idle-${direction}`,
                frames: this.anims.generateFrameNumbers('idle', { start: startFrame, end: startFrame + 7 }),
                frameRate: 8,
                repeat: -1
            });

            this.anims.create({
                key: `walk-${direction}`,
                frames: this.anims.generateFrameNumbers('walk', { start: startFrame, end: startFrame + 7 }),
                frameRate: 15,
                repeat: -1
            });

            this.anims.create({
                key: `run-${direction}`,
                frames: this.anims.generateFrameNumbers('run', { start: startFrame, end: startFrame + 7 }),
                frameRate: 20,
                repeat: -1
            });

            this.anims.create({
                key: `melee-${direction}`,
                frames: this.anims.generateFrameNumbers('melee', { start: startFrame, end: startFrame + 14 }),
                frameRate: 40,
                repeat: 0
            });

            this.anims.create({
                key: `rolling-${direction}`,
                frames: this.anims.generateFrameNumbers('rolling', { start: startFrame, end: startFrame + 14 }),
                frameRate: 24,
                repeat: 0
            });

            this.anims.create({
                key: `take-damage-${direction}`,
                frames: this.anims.generateFrameNumbers('take-damage', { start: startFrame, end: startFrame + 7 }),
                frameRate: 20,
                repeat: 0
            });
        });

        // --- Hero with Physics ---
        this.hero = this.physics.add.sprite(map.width / 2, map.height / 2, 'idle', 0);
        this.hero.body.setSize(32, 32, true);
        this.hero.body.pushable = false;
        this.hero.takeDamage = this.takeDamage.bind(this);

        this.hero.on('animationcomplete', (animation) => {
            if (animation.key.startsWith('melee-') || animation.key.startsWith('rolling-') || animation.key.startsWith('take-damage-')) {
                this.hero.anims.play(`idle-${this.facing}`, true);
            }
        }, this);

        // --- Black Knight ---
        this.blackKnight = this.physics.add.sprite(map.width / 2, map.height / 4, 'idle', 0);
        this.blackKnight.body.setSize(64, 64, true);
        this.blackKnight.body.setOffset(32, 48); // x: 32 for centering, y: 48 to move it down
        this.blackKnight.setTint(0x666666);
        this.blackKnight.body.pushable = false;
        this.blackKnight.anims.play('idle-s', true); // Face down towards the player
        this.blackKnight.takeDamage = this.takeDamage.bind(this);
        this.blackKnight.maxHealth = 50;
        this.blackKnight.health = this.blackKnight.maxHealth;
        this.blackKnight.attackCooldown = 0;

        this.blackKnight.on('animationcomplete', (animation) => {
            if (animation.key.startsWith('take-damage-')) {
                const direction = this.getDirectionFromAngle(Phaser.Math.Angle.Between(this.blackKnight.x, this.blackKnight.y, this.hero.x, this.hero.y));
                this.blackKnight.anims.play(`idle-${direction}`, true);
            }
        }, this);

        // --- Collisions ---
        const rects = [
            { x: 135, y: 120, w: 1268, h: 5, label: 'arena_top' },
            { x: 105, y: 818, w: 1265, h: 5, label: 'arena_bottom' },
            { x: 135, y: 120, w: 5, h: 728, label: 'arena_left' },
            { x: 1368, y: 120, w: 5, h: 728, label: 'arena_right' }
        ];
        if (this.obstacles) this.obstacles.clear(true, true);
        this.obstacles = this.physics.add.staticGroup();
        rects.forEach(r => {
            const o = this.obstacles.create(r.x + r.w / 2, r.y + r.h / 2, null);
            o.setVisible(false);
            o.body.setSize(r.w, r.h);
            o.label = r.label;
        });
        this.physics.add.collider(this.hero, this.obstacles);
        this.physics.add.collider(this.blackKnight, this.obstacles);
        this.physics.add.collider(this.hero, this.blackKnight);
        this.physics.add.overlap(this.hero, this.blackKnight, this.handlePlayerAttackOnKnight, (proc, hero, knight) => {
            return hero.anims.currentAnim && hero.anims.currentAnim.key.startsWith('melee-');
        }, this);
        // F2 debug
        if (!this._f2) {
            this._f2 = true;
            this.input.keyboard.on('keydown-F2', () => {
                this.obstacles.children.iterate(o => {
                    if (!o.debugG) {
                        o.debugG = this.add.graphics().lineStyle(1, 0xff0000)
                            .strokeRect(o.body.x, o.body.y, o.body.width, o.body.height);
                    } else { o.debugG.destroy(); o.debugG = null; }
                });
            });
        }

        // --- Debug Red Boundaries (X) ---
        const redBoundaries = this.add.graphics().setDepth(100).setVisible(false);
        redBoundaries.lineStyle(2, 0xff0000, 0.8);
        rects.forEach(r => {
            redBoundaries.strokeRect(r.x, r.y, r.w, r.h);
        });
        redBoundaries.strokeRect(this.blackKnight.body.x, this.blackKnight.body.y, this.blackKnight.body.width, this.blackKnight.body.height);


        if (!this._xHook) {
            this._xHook = true;
            this.input.keyboard.on('keydown-X', () => {
                redBoundaries.setVisible(!redBoundaries.visible);
            });
            this.redBoundaries = redBoundaries; // Store for update loop
            this.boundaryRects = rects; // Store for update loop
        }

        // --- Health Bar ---
        this.hero.maxHealth = 100;
        this.hero.health = this.hero.maxHealth;
        this.healthBarBg = this.add.graphics().setScrollFactor(0).setDepth(101);
        this.healthBar = this.add.graphics().setScrollFactor(0).setDepth(102);
        this.updateHealthBar(); // Initial draw

        // --- Camera ---
        this.cameras.main.startFollow(this.hero);
        this.cameras.main.setBounds(0, 0, map.width, map.height);
        this.cameras.main.roundPixels = true;
    }

    handlePlayerAttackOnKnight(hero, knight) {
        if (knight.isTakingDamage) {
            return;
        }

        knight.isTakingDamage = true;
        this.takeDamage(knight, hero);
        this.time.delayedCall(500, () => { knight.isTakingDamage = false; });
    }

    takeDamage(victim, attacker) {
        victim.health -= 10;
        if (victim === this.hero) {
            this.updateHealthBar();
        }

        const angle = Phaser.Math.Angle.Between(attacker.x, attacker.y, victim.x, victim.y);
        const direction = this.getDirectionFromAngle(angle);
        victim.anims.play(`take-damage-${direction}`, true);

        victim.setTint(0xff0000);
        this.time.delayedCall(200, () => {
            if (victim === this.blackKnight) {
                victim.setTint(0x666666);
            } else {
                victim.clearTint();
            }
        });

        if (victim.health <= 0) {
            victim.disableBody(true, true); // Or handle death another way
        }
    }

    updateHealthBar() {
        const x = 20;
        const y = 20;
        const w = 200;
        const h = 20;

        this.healthBarBg.clear();
        this.healthBarBg.fillStyle(0xff0000);
        this.healthBarBg.fillRect(x, y, w, h);

        this.healthBar.clear();
        this.healthBar.fillStyle(0x00ff00);
        const healthWidth = (this.hero.health / this.hero.maxHealth) * w;
        this.healthBar.fillRect(x, y, healthWidth, h);
    }

    getDirectionFromAngle(angle) {
        const degrees = Phaser.Math.RadToDeg(angle);
        let direction = 's';
        if (degrees >= -22.5 && degrees < 22.5) direction = 'e';
        else if (degrees >= 22.5 && degrees < 67.5) direction = 'se';
        else if (degrees >= 67.5 && degrees < 112.5) direction = 's';
        else if (degrees >= 112.5 && degrees < 157.5) direction = 'sw';
        else if (degrees >= 157.5 || degrees < -157.5) direction = 'w';
        else if (degrees >= -157.5 && degrees < -112.5) direction = 'nw';
        else if (degrees >= -112.5 && degrees < -67.5) direction = 'n';
        else if (degrees >= -67.5 && degrees < -22.5) direction = 'ne';
        return direction;
    }

    update(time, delta) {
        // --- Black Knight AI ---
        const knight = this.blackKnight;
        if (knight.active) {
            const knightAnim = knight.anims.currentAnim;
            const isKnightInAction = (knightAnim && knightAnim.key.startsWith('take-damage-')) || knight.isTakingDamage;

            if (!isKnightInAction) {
                const angle = Phaser.Math.Angle.Between(knight.x, knight.y, this.hero.x, this.hero.y);
                const direction = this.getDirectionFromAngle(angle);

                knight.body.setVelocity(0, 0);
                knight.anims.play(`idle-${direction}`, true);
            }
        }


        if (this.redBoundaries && this.redBoundaries.visible) {
            this.redBoundaries.clear();
            this.redBoundaries.lineStyle(2, 0xff0000, 0.8);
            this.boundaryRects.forEach(r => {
                this.redBoundaries.strokeRect(r.x, r.y, r.w, r.h);
            });
            this.redBoundaries.strokeRect(this.blackKnight.body.x, this.blackKnight.body.y, this.blackKnight.body.width, this.blackKnight.body.height);
        }

        const { left, right, up, down, space, m, r } = this.keys;

        const currentAnim = this.hero.anims.currentAnim;
        const isActionInProgress = currentAnim && (currentAnim.key.startsWith('melee-') || currentAnim.key.startsWith('rolling-')) && this.hero.anims.isPlaying;

        if (isActionInProgress) {
            if (currentAnim.key.startsWith('melee-')) {
                this.hero.body.setVelocity(0, 0);
            } else if (currentAnim.key.startsWith('rolling-')) {
                const rollVelocity = new Phaser.Math.Vector2();
                switch (this.facing) {
                    case 'n': rollVelocity.y = -1; break;
                    case 's': rollVelocity.y = 1; break;
                    case 'w': rollVelocity.x = -1; break;
                    case 'e': rollVelocity.x = 1; break;
                    case 'nw': rollVelocity.set(-1, -1); break;
                    case 'ne': rollVelocity.set(1, -1); break;
                    case 'sw': rollVelocity.set(-1, 1); break;
                    case 'se': rollVelocity.set(1, 1); break;
                }
                rollVelocity.normalize().scale(this.rollSpeed);
                this.hero.body.setVelocity(rollVelocity.x, rollVelocity.y);
            }
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(m)) {
            this.hero.anims.play(`melee-${this.facing}`, true);
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(r)) {
            this.hero.anims.play(`rolling-${this.facing}`, true);
            return;
        }

        const velocity = new Phaser.Math.Vector2();

        // --- Determine direction from key presses ---
        let direction = this.facing;
        if (up.isDown) {
            if (left.isDown) direction = 'nw';
            else if (right.isDown) direction = 'ne';
            else direction = 'n';
        } else if (down.isDown) {
            if (left.isDown) direction = 'sw';
            else if (right.isDown) direction = 'se';
            else direction = 's';
        } else if (left.isDown) {
            direction = 'w';
        } else if (right.isDown) {
            direction = 'e';
        }

        // --- Set velocity based on keys pressed ---
        if (left.isDown) velocity.x = -1;
        else if (right.isDown) velocity.x = 1;
        if (up.isDown) velocity.y = -1;
        else if (down.isDown) velocity.y = 1;

        // --- Play animations ---
        if (velocity.length() > 0) {
            this.facing = direction;

            const currentSpeed = space.isDown ? this.runSpeed : this.walkSpeed;
            velocity.normalize().scale(currentSpeed);

            const animPrefix = space.isDown ? 'run' : 'walk';
            this.hero.anims.play(`${animPrefix}-${this.facing}`, true);
        } else {
            this.hero.anims.play(`idle-${this.facing}`, true);
        }
        
        this.hero.body.setVelocity(velocity.x, velocity.y);
    }
}

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 450,
    backgroundColor: '#000000',
    pixelArt: true,
    roundPixels: true,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 }
        }
    },
    scene: [PlayScene]
};

const game = new Phaser.Game(config); 