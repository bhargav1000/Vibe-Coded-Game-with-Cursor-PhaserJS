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
        this.load.spritesheet('kick', 'Kick.png', { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('melee2', 'Melee2.png', { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('special1', 'Special1.png', { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('die', 'Die.png', { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('unsheath', 'UnSheathSword.png', { frameWidth: 128, frameHeight: 128 });
        this.load.image('healthbar', 'healthbar.png');
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
        this.keys.k = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K);
        this.keys.n = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.N);
        this.keys.s = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.keys.q = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
        this.keys.d = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.walkSpeed = 200;
        this.runSpeed = 350;
        this.rollSpeed = 400;
        this.facing = 's'; // Default facing direction
        this.isDeathSequenceActive = false;

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
                frames: this.anims.generateFrameNumbers('walk', { start: startFrame, end: startFrame + 14 }),
                frameRate: 15,
                repeat: -1
            });

            this.anims.create({
                key: `run-${direction}`,
                frames: this.anims.generateFrameNumbers('run', { start: startFrame, end: startFrame + 14 }),
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

            this.anims.create({
                key: `kick-${direction}`,
                frames: this.anims.generateFrameNumbers('kick', { start: startFrame, end: startFrame + 14 }),
                frameRate: 40,
                repeat: 0
            });

            this.anims.create({
                key: `melee2-${direction}`,
                frames: this.anims.generateFrameNumbers('melee2', { start: startFrame, end: startFrame + 14 }),
                frameRate: 24,
                repeat: 0
            });

            this.anims.create({
                key: `special1-${direction}`,
                frames: this.anims.generateFrameNumbers('special1', { start: startFrame, end: startFrame + 14 }),
                frameRate: 30,
                repeat: 0
            });
        });

        // Add a single death animation, as it's not directional
        this.anims.create({
            key: 'die',
            frames: this.anims.generateFrameNumbers('die', { start: 0, end: 14 }),
            frameRate: 8,
            repeat: 0
        });

        directions.forEach((direction, index) => {
            const startFrame = index * framesPerRow;
            this.anims.create({
                key: `unsheath-${direction}`,
                frames: this.anims.generateFrameNumbers('unsheath', { start: startFrame, end: startFrame + 14 }),
                frameRate: 15,
                repeat: 0
            });
        });

        // --- Hero with Physics ---
        this.hero = this.physics.add.sprite(map.width / 2, map.height / 2, 'idle', 0);
        this.hero.body.setCircle(24);
        this.hero.body.setOffset(40, 40);
        this.hero.body.pushable = false;
        this.hero.takeDamage = this.takeDamage.bind(this);

        this.hero.on('animationcomplete', (animation) => {
            if (animation.key.startsWith('melee-') || animation.key.startsWith('rolling-') || animation.key.startsWith('take-damage-') || animation.key.startsWith('kick-') || animation.key.startsWith('melee2-') || animation.key.startsWith('special1-')) {
                this.hero.anims.play(`idle-${this.facing}`, true);
            }
        }, this);

        // --- Purple Knight ---
        this.purpleKnight = this.physics.add.sprite(map.width / 2, map.height / 4, 'idle', 0);
        this.purpleKnight.body.setSize(64, 64, true);
        this.purpleKnight.body.setOffset(32, 48); // x: 32 for centering, y: 48 to move it down
        this.purpleKnight.setTint(0x9400D3); // A nice purple
        this.purpleKnight.body.pushable = false;
        this.purpleKnight.anims.play('idle-s', true); // Face down towards the player
        this.purpleKnight.takeDamage = this.takeDamage.bind(this);
        this.purpleKnight.maxHealth = 50;
        this.purpleKnight.health = this.purpleKnight.maxHealth;
        this.purpleKnight.attackCooldown = 0;

        // --- Purple Knight's Physical Body (Green Box) ---
        this.knightCollider = this.physics.add.sprite(this.purpleKnight.x, this.purpleKnight.y, null).setVisible(false);
        this.knightCollider.body.setCircle(27);
        this.knightCollider.body.setOffset(-12, 8);
        this.knightCollider.body.pushable = false;

        this.purpleKnight.on('animationcomplete', (animation) => {
            if (animation.key.startsWith('take-damage-')) {
                const direction = this.getDirectionFromAngle(Phaser.Math.Angle.Between(this.purpleKnight.x, this.purpleKnight.y, this.hero.x, this.hero.y));
                this.purpleKnight.anims.play(`idle-${direction}`, true);
            }
        }, this);

        // --- Collisions ---
        const rects = [
            { x: 135, y: 165, w: 1268, h: 5, label: 'arena_top' },
            { x: 105, y: 818, w: 1265, h: 5, label: 'arena_bottom' },
            { x: 135, y: 165, w: 5, h: 728, label: 'arena_left' },
            { x: 1368, y: 165, w: 5, h: 728, label: 'arena_right' }
        ];
        if (this.obstacles) this.obstacles.destroy();
        this.obstacles = this.physics.add.staticGroup();
        rects.forEach(r => {
            const o = this.obstacles.create(r.x + r.w / 2, r.y + r.h / 2, null);
            o.setVisible(false);
            o.body.setSize(r.w, r.h);
            o.label = r.label;
        });
        this.physics.add.collider(this.hero, this.obstacles);
        this.physics.add.collider(this.purpleKnight, this.obstacles);
        this.physics.add.collider(this.hero, this.knightCollider);
        this.physics.add.overlap(this.hero, this.purpleKnight, this.handlePlayerAttackOnKnight, (hero, knight) => {
            if (knight.isDead) return false;
            const currentAnimKey = hero.anims.currentAnim ? hero.anims.currentAnim.key : '';
            const isAttacking = ['melee-', 'kick-', 'melee2-', 'special1-'].some(prefix => currentAnimKey.startsWith(prefix));
            const canKnightTakeDamage = !knight.isTakingDamage;
            return isAttacking && canKnightTakeDamage;
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
        redBoundaries.strokeRect(this.purpleKnight.body.x, this.purpleKnight.body.y, this.purpleKnight.body.width, this.purpleKnight.body.height);


        if (!this._xHook) {
            this._xHook = true;
            this.blueBoundaries = this.add.graphics().setDepth(100).setVisible(false);
            this.greenBoundaries = this.add.graphics().setDepth(100).setVisible(false);
            this.input.keyboard.on('keydown-X', () => {
                redBoundaries.setVisible(!redBoundaries.visible);
                this.blueBoundaries.setVisible(!this.blueBoundaries.visible);
                this.greenBoundaries.setVisible(!this.greenBoundaries.visible);
            });
            this.redBoundaries = redBoundaries; // Store for update loop
            this.boundaryRects = rects; // Store for update loop

            // --- Purple Knight Health Bar ---
            const barX = this.game.config.width / 2;
            const barY = this.game.config.height - 30; // Nudge it up a bit for the smaller size
            this.knightHealthBarBg = this.add.image(barX, barY, 'healthbar').setOrigin(0.5).setScale(0.1).setScrollFactor(0).setDepth(102);
            this.knightHealthBarBg.setCrop(0, 0, this.knightHealthBarBg.width - 38, this.knightHealthBarBg.height);
            this.knightHealthBar = this.add.graphics().setScrollFactor(0).setDepth(101);
            this.knightNameText = this.add.text(barX, barY - (this.knightHealthBarBg.displayHeight / 2) + 30, 'Your Purple Knight', {
                fontSize: '10px',
                fill: '#fff',
                fontStyle: 'bold'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(103);
            this.updateKnightHealthBar();

            // --- Game Over UI ---
            this.gameOverText = this.add.text(this.game.config.width / 2, this.game.config.height / 2 - 40, '', {
                fontSize: '48px',
                fill: '#ff0000',
                fontStyle: 'bold'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(200).setVisible(false);

            this.restartText = this.add.text(this.game.config.width / 2, this.game.config.height / 2 + 20, 'Press Q to Restart', {
                fontSize: '24px',
                fill: '#ffffff'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(200).setVisible(false);
            this.gameOverActive = false;


            // --- Health Bar ---
            this.hero.maxHealth = 100;
            this.hero.health = this.hero.maxHealth;
            this.healthBarBg = this.add.graphics().setScrollFactor(0).setDepth(101);
            this.healthBar = this.add.graphics().setScrollFactor(0).setDepth(102);
            this.updateHealthBar(); // Initial draw
        }

        // --- Camera ---
        this.cameras.main.startFollow(this.hero);
        this.cameras.main.setBounds(0, 0, map.width, map.height);
        this.cameras.main.roundPixels = true;
    }

    handlePlayerAttackOnKnight(hero, knight) {
        if (knight.isTakingDamage) {
            return;
        }

        const attackType = hero.anims.currentAnim.key.split('-')[0];
        knight.isTakingDamage = true;
        this.takeDamage(knight, hero, attackType);
        // The knight should be immune for a short period after being hit.
        this.time.delayedCall(500, () => { knight.isTakingDamage = false; });
    }

    takeDamage(victim, attacker, attackType) {
        if (victim.isDead) return;

        let damage = 10; // Default melee damage
        if (attackType === 'kick') {
            damage = 5;
        }

        victim.health -= damage;
        if (victim === this.hero) {
            this.updateHealthBar();
        } else if (victim === this.purpleKnight) {
            this.updateKnightHealthBar();
        }

        // Knockback Logic
        let knockbackDistance = 0;
        if (attackType === 'kick') {
            knockbackDistance = 8;
        } else if (attackType === 'special1') {
            knockbackDistance = 20;
        }

        if (victim === this.purpleKnight && knockbackDistance > 0) {
            const knockbackAngle = Phaser.Math.Angle.Between(attacker.x, attacker.y, victim.x, victim.y);
            const knockbackVelocity = new Phaser.Math.Vector2(Math.cos(knockbackAngle), Math.sin(knockbackAngle)).scale(knockbackDistance * 10);
            victim.body.setVelocity(knockbackVelocity.x, knockbackVelocity.y);
            this.knightCollider.body.setVelocity(knockbackVelocity.x, knockbackVelocity.y);
            this.time.delayedCall(150, () => {
                if (victim.active && !victim.isDead) {
                    victim.body.setVelocity(0, 0);
                    this.knightCollider.body.setVelocity(0, 0);
                }
            });
        }

        let angle = Phaser.Math.Angle.Between(attacker.x, attacker.y, victim.x, victim.y);
        if (victim === this.purpleKnight) {
            // Invert the angle for the knockback effect
            angle = Phaser.Math.Angle.Wrap(angle + Math.PI);
        }
        const direction = this.getDirectionFromAngle(angle);
        victim.anims.play(`take-damage-${direction}`, true);

        victim.setTint(0xff0000);
        this.time.delayedCall(200, () => {
            if (victim === this.purpleKnight) {
                victim.setTint(0x9400D3);
            } else {
                victim.clearTint();
            }
        });

        if (victim.health <= 0 && !victim.isDead) {
            this.isDeathSequenceActive = true;
            victim.isDead = true;
            victim.body.setVelocity(0, 0);

            if (victim === this.purpleKnight) {
                this.knightCollider.body.setVelocity(0, 0);
                const direction = this.getDirectionFromAngle(Phaser.Math.Angle.Between(this.hero.x, this.hero.y, victim.x, victim.y));
                this.hero.anims.playReverse(`unsheath-${direction}`);
                // After animations, show win screen and restart
                this.time.delayedCall(1000, () => {
                    this.showGameOverScreen(true);
                    this.time.delayedCall(2000, () => this.scene.restart());
                });
                this.knightHealthBarBg.setVisible(false);
                this.knightHealthBar.setVisible(false);
                this.knightNameText.setVisible(false);
            } else { // victim is hero
                const victor = this.purpleKnight;
                const direction = this.getDirectionFromAngle(Phaser.Math.Angle.Between(victor.x, victor.y, victim.x, victim.y));
                victor.anims.play(`idle-${direction}`, true);
                this.healthBarBg.setVisible(false);
                this.healthBar.setVisible(false);
                this.time.delayedCall(1500, () => {
                    this.showGameOverScreen(false);
                });
            }

            victim.anims.play('die', true);
            victim.once('animationcomplete-die', () => {
                victim.disableBody(true, false); // Keep sprite visible, disable physics
                if (victim === this.purpleKnight) {
                    this.knightCollider.disableBody(true, true);
                }
            });
        }
    }

    showGameOverScreen(didWin) {
        this.gameOverText.setText(didWin ? 'YOU WIN' : 'YOU DIED').setVisible(true);
        if (!didWin) {
            this.gameOverActive = true;
            this.isDeathSequenceActive = false; // Allow Q to be pressed
            this.restartText.setVisible(true);
        }
    }

    updateKnightHealthBar() {
        this.knightHealthBar.clear();
        this.knightHealthBar.fillStyle(0xff0000);

        const healthPercentage = this.purpleKnight.health / this.purpleKnight.maxHealth;
        const barTopLeftX = this.knightHealthBarBg.getTopLeft().x;
        const barTopLeftY = this.knightHealthBarBg.getTopLeft().y;

        // Final precision adjustments
        const leftPadding = 86 * 0.1;
        const rightPadding = 120 * 0.1;
        const yOffset = 475 * 0.1;  // Previous offset + 70 pixels down
        const barHeight = 72 * 0.1; // Height from last adjustment

        const barInnerWidth = this.knightHealthBarBg.displayWidth - leftPadding - rightPadding;
        const healthWidth = healthPercentage * barInnerWidth;

        this.knightHealthBar.fillRect(barTopLeftX + leftPadding, barTopLeftY + yOffset, Math.max(0, healthWidth), barHeight);
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
        if (this.gameOverActive) {
            if (Phaser.Input.Keyboard.JustDown(this.keys.q)) {
                this.scene.restart();
            }
            return; // Lock all other updates
        }

        if (this.isDeathSequenceActive) {
            this.hero.body.setVelocity(0, 0);
            return;
        }

        // --- Purple Knight AI ---
        const knight = this.purpleKnight;
        if (knight.active) {
            if (knight.isDead) {
                return;
            }
            this.knightCollider.setPosition(knight.x, knight.y);
            const knightAnim = knight.anims.currentAnim;
            const isKnightInAction = (knightAnim && knightAnim.key.startsWith('take-damage-')) || knight.isTakingDamage;

            if (!isKnightInAction) {
                const angle = Phaser.Math.Angle.Between(knight.x, knight.y, this.hero.x, this.hero.y);
                const direction = this.getDirectionFromAngle(angle);

                knight.body.setVelocity(0, 0);
                this.knightCollider.body.setVelocity(0, 0);
                knight.anims.play(`idle-${direction}`, true);
            }
        }


        if (this.redBoundaries && this.redBoundaries.visible) {
            this.redBoundaries.clear();
            this.redBoundaries.lineStyle(2, 0xff0000, 0.8);
            this.boundaryRects.forEach(r => {
                this.redBoundaries.strokeRect(r.x, r.y, r.w, r.h);
            });
            this.redBoundaries.strokeRect(this.purpleKnight.body.x, this.purpleKnight.body.y, this.purpleKnight.body.width, this.purpleKnight.body.height);
        }
        if (this.blueBoundaries && this.blueBoundaries.visible) {
            this.blueBoundaries.clear();
            this.blueBoundaries.lineStyle(2, 0x0000ff, 0.8);
            this.blueBoundaries.strokeCircle(this.hero.body.x + this.hero.body.radius, this.hero.body.y + this.hero.body.radius, this.hero.body.radius);
        }
        if (this.greenBoundaries && this.greenBoundaries.visible) {
            this.greenBoundaries.clear();
            this.greenBoundaries.lineStyle(2, 0x00ff00, 0.8);
            this.greenBoundaries.strokeCircle(this.knightCollider.body.x + this.knightCollider.body.radius, this.knightCollider.body.y + this.knightCollider.body.radius, this.knightCollider.body.radius);
        }


        const { left, right, up, down, space, m, r, k, n, s } = this.keys;

        const currentAnim = this.hero.anims.currentAnim;
        const isActionInProgress = currentAnim && (currentAnim.key.startsWith('melee-') || currentAnim.key.startsWith('rolling-') || currentAnim.key.startsWith('kick-') || currentAnim.key.startsWith('melee2-') || currentAnim.key.startsWith('special1-')) && this.hero.anims.isPlaying;

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

        if (Phaser.Input.Keyboard.JustDown(k)) {
            this.hero.anims.play(`kick-${this.facing}`, true);
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(n)) {
            this.hero.anims.play(`melee2-${this.facing}`, true);
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(s)) {
            this.hero.anims.play(`special1-${this.facing}`, true);
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