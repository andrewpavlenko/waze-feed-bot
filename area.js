class Area {
  constructor(bounds) {
    this.left = bounds.left;
    this.right = bounds.right;
    this.top = bounds.top;
    this.bottom = bounds.bottom;
    this.middleX = this.right - ((this.right - this.left) / 2);
    this.middleY = this.top - ((this.top - this.bottom) / 2);
  }

  get northWestQuarter() {
    return {
      left: this.left,
      right: this.middleX,
      top: this.top,
      bottom: this.middleY
    };
  }

  get northEastQuarter() {
    return {
      left: this.middleX,
      right: this.right,
      top: this.top,
      bottom: this.middleY
    };
  }

  get southWestQuarter() {
    return {
      left: this.left,
      right: this.middleX,
      top: this.middleY,
      bottom: this.bottom,
    };
  }

  get southEastQuarter() {
    return {
      left: this.middleX,
      right: this.right,
      top: this.middleY,
      bottom: this.bottom
    };
  }
}

module.exports = Area;
