"use strict";

var statuses = {
    healthy: {colour: "DarkSlateBlue", name: "Healthy", canInfect: false, canBeInfected: true, endState: false, dead: false},
    incubating: {colour: "DarkRed", name: "Incubating", canInfect: true, canBeInfected: false, endState: false, dead: false},
    sick: {colour: "Crimson", name: "Sick", canInfect: true, canBeInfected: false, endState: false, dead: false},
    recovered: {colour: "DarkGreen", name: "Recovered", canInfect: false, canBeInfected: false, endState: true, dead: false},
    saved: {colour: "DarkOliveGreen", name: "Saved", canInfect: false, canBeInfected: false, endState: true, dead: false },
    couldNotSave: {colour: "Grey", name: "Died In Care", canInfect: false, canBeInfected: false, endState: true, dead: true },
    dead: {colour: "Black", name: "Died Without Care", canInfect: false, canBeInfected: false, endState: true, dead: true}
};

var settings = {
    movementSpeed: 2,
    initialEntities: 200,
    entityRadius: 8,
    recoveryTime: 1000,
    deathRate: 0.5,
    deathTime: 500,
    careRecoveryBonus: 1,
    careLifeSaveRate: 1.0,
    carePlaces: 20
};

var masterFrame = 0;


var entities = [];


function width() {
    return document.getElementById("main").clientWidth;
}

function height() {
    return document.getElementById("main").clientHeight;
}

function randInt(max) {
    return Math.floor(Math.random() * max);
}

function canvas() {
    return document.getElementById("main").getContext("2d");
}

function circle(ctx, x, y, r, c) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2*Math.PI);
    ctx.fill();
}

class Entity {

    updateBounds() {
        this.tlx = this.x - settings.halfEntityRadius;
        this.tly = this.y - settings.halfEntityRadius;
        this.brx = this.x + settings.halfEntityRadius;
        this.bry = this.y + settings.halfEntityRadius;
    }

    canSicken() {
        return (!this.isDead()) && (this.status !== statuses.sick) && (this.status !== statuses.recovered) && (this.status !== statuses.saved);
    }

    collideWith(other) {
        let react = Math.random();
        this.xd = -this.xd;
        this.yd = -this.yd;
        if (this.status.canBeInfected) {
            if (other.status.canInfect) {
                this.sicken();
            }
        }
    }

    die() {
        this.willDie = false;
        if (this.inCare) {
            if (Math.random() < settings.careLifeSaveRate) {
                this.status = statuses.saved;
                this.inCare = false;
                return;
            } else {
                this.status = statuses.couldNotSave;
            }
        }
        this.status = statuses.dead;
    }

    isDead() {
        return (this.status.dead);
    }

    isTerminal() {
        return (this.status.endState);
    }

    sicken() {
        this.status = statuses.sick;
        this.timeSick = 0;
        this.willDie = (Math.random() < settings.deathRate);
    }

    distanceTo(e) {
        var w = Math.pow(this.x - e.x, 2);
        var h = Math.pow(this.y - e.y, 2);
        return Math.sqrt(w+h);
    }

    constructor() {
        this.x = randInt(settings.effectiveBoundsWidth) + settings.effectiveLeftBound;
        this.y = randInt(settings.effectiveBoundsHeight) + settings.effectiveTopBound;
        this.xd = settings.movementSpeed;
        this.yd = settings.movementSpeed;
        if (Math.random() >= 0.5) this.xd = -this.xd;
        if (Math.random() >= 0.5) this.yd = -this.yd;
        this.status = statuses.healthy;
        this.inCare = false;
        this.willDie = false;
        this.updateBounds();
    }

    draw(ctx) {
        if (this.isDead()) return;
        circle(ctx, this.x, this.y, settings.entityRadius, this.status.colour);
        if (this.inCare) {
            circle(ctx, this.x, this.y, settings.entityRadius/2, "DarkGreen");
        }
    }

    update() {
        if (this.isDead()) return;

        if (this.status === statuses.sick) {

            this.timeSick++;
            if (this.willDie) {
                if (this.timeSick >= settings.deathTime) {
                    this.die();
                }
            } else {
                let effectiveRecoveryTime = settings.recoveryTime;
                if (this.inCare) {
                    effectiveRecoveryTime -= settings.careRecoveryBonus;
                }
                if (this.timeSick >= effectiveRecoveryTime) {
                    this.status = statuses.recovered;
                    this.inCare = false;
                }
            }
        }

        if (this.status.canInfect) return;

        this.x += this.xd;
        this.y += this.yd;
        if (this.x > settings.effectiveRightBound) this.xd = -this.xd;
        if (this.x < settings.effectiveLeftBound) this.xd = -this.xd;
        if (this.y > settings.effectiveBottomBound) this.yd = -this.yd;
        if (this.y < settings.effectiveTopBound) this.yd = -this.yd;
        this.updateBounds();
    }
}

function updateGraph() {
    let statusCounts = {};
    let graph = document.getElementById("graph");
    let graphHeight = graph.clientHeight;
    let ctx = graph.getContext("2d");
    let total = entities.length;

    for (let status in statuses) {
        statusCounts[statuses[status].name] = 0;
    }
    for (let entity of entities) {
        statusCounts[entity.status.name]++;
    }
    let yPos = 0;
    for (let status in statuses) {
        let target = statuses[status];
        let barSize = (statusCounts[target.name] / total) * graphHeight;
        ctx.strokeStyle = target.colour;
        ctx.beginPath();
        ctx.moveTo(masterFrame,yPos);
        ctx.lineTo(masterFrame,yPos+barSize);
        ctx.stroke();
        yPos += barSize;
    }

    let caregraph = document.getElementById("caregraph");
    let careGraphHeight = caregraph.clientHeight;
    let cctx = caregraph.getContext("2d");
    let inCareCount = 0;
    let needsCareCount = 0;
    for (let entity of entities) {
        if (entity.inCare) {
            inCareCount++;
        } else {
            if (entity.willDie) {
                needsCareCount++;
            }
        }
    }
    cctx.strokeStyle = "LightSkyBlue";
    cctx.beginPath();
    let careYPos = (inCareCount / total) * careGraphHeight;
    cctx.moveTo(masterFrame,0); cctx.lineTo(masterFrame, careYPos); cctx.stroke();
    cctx.strokeStyle = "LightCoral";
    cctx.beginPath();
    let unsatYPos = (needsCareCount / total) * careGraphHeight;
    cctx.moveTo(masterFrame,careYPos); cctx.lineTo(masterFrame, careYPos+unsatYPos); cctx.stroke();


}

function frame() {
    masterFrame++;
    for (let ia=0; ia<entities.length; ia++) {
        for (let ib=ia+1; ib<entities.length; ib++) {

            let a = entities[ia];
            let b = entities[ib];
            if (a.isDead()) continue;
            if (b.isDead()) continue;
            if (a.brx < b.tlx) continue;
            if (a.bry < b.tly) continue;
            if (a.tlx > b.brx) continue;
            if (a.tly > b.bry) continue;
            if (a.distanceTo(b) <= settings.entityRadius) {
                a.collideWith(b);
                b.collideWith(a);
            }
        }
    }

    let carePlaces = settings.carePlaces;
    for (let entity of entities) {
        if (entity.inCare) carePlaces--;
    }
    if (carePlaces > 0) {
        for (let entity of entities) {
            if (entity.willDie) {
                entity.inCare = true;
                carePlaces--;
                if (carePlaces == 0) break;
            }
        }
    }


    let ctx = canvas();
    ctx.clearRect(0,0,width(),height());

    entities.forEach(it => it.update());
    entities.forEach(it => it.draw(ctx));

    updateGraph();

    if (!entities.every(it => it.isTerminal())) {
        window.requestAnimationFrame(frame);
    }

}

function start() {
    masterFrame = 0;
   settings.halfEntityRadius = settings.entityRadius / 2;
   settings.effectiveRightBound = width() - settings.halfEntityRadius;
   settings.effectiveLeftBound = settings.halfEntityRadius;
   settings.effectiveBottomBound = height() - settings.halfEntityRadius;
   settings.effectiveTopBound = settings.halfEntityRadius;
   settings.effectiveBoundsWidth = settings.effectiveRightBound - settings.effectiveLeftBound;
   settings.effectiveBoundsHeight = settings.effectiveBottomBound - settings.effectiveTopBound;
    for (let i=0; i<settings.initialEntities; i++) {
        entities.push(new Entity());
    }
    entities[0].sicken();

   window.requestAnimationFrame(frame);

}
