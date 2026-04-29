
Popzy.elements = [];

function Popzy(options = {}) {
    this.opt = Object.assign(
        {
            cssClass: [],
            destroyOnClose: true,
            footer: false,
            closeMethods: ["button", "overlay", "escape"],
        },
        options,
    );

    this.template = document.querySelector(`#${this.opt.templateId}`);

    if (!this.template) {
        console.error(`#${this.opt.templateId} does not exist!`);
        return;
    }

    const { closeMethods } = this.opt;
    // khi dùng _varName để đặt tên biến thì quy ước (giữa các devs) biến đó chỉ đc dùng trong hàm tạo. K dùng đối tướng sau khi tạo để gọi
    this._allowButtonClose = closeMethods.includes("button");
    this._allowBackdropClose = closeMethods.includes("overlay");
    this._allowEscapeClose = closeMethods.includes("escape");

    this._footerButtons = [];

    // lấy _handleEscapeKey từ prototype sau đó bind chính đối tượng vừa đc tạo rồi tạo chính đối tượng sở hữu riêng bind chính đối tượng đó
    this._handleEscapeKey = this._handleEscapeKey.bind(this)
}

Popzy.prototype._build = function () {
    const content = this.template.content.cloneNode(true);

    // Create modal elements
    this._backdrop = document.createElement("div");
    this._backdrop.className = "popzy__backdrop";

    const container = document.createElement("div");
    container.className = "popzy__container";

    this.opt.cssClass.forEach((className) => {
        if (typeof className === "string") {
            container.classList.add(className);
        }
    });

    if (this._allowButtonClose) {
        const closeBtn = this.createButton(
            "&times;",
            "popzy__close",
            () => this.close(), // trong arrow function k có this riêng -> dùng this.template
        );

        container.append(closeBtn);
    }

    const modalContent = document.createElement("div");
    modalContent.className = "popzy__content";

    // Append content and elements
    modalContent.append(content);
    container.append(modalContent);

    if (this.opt.footer) {
        this._modalFooter = document.createElement("div");
        this._modalFooter.className = "popzy__footer";

        this.renderFooterContent();
        this.renderFooterButtons();

        container.append(this._modalFooter);
    }

    this._backdrop.append(container);
    document.body.append(this._backdrop);
};

Popzy.prototype.setFooterContent = function (html) {
    this._footerContent = html;
    this.renderFooterContent();
};

Popzy.prototype.addFooterButton = function (title, cssClass, callback) {
    const button = this.createButton(title, cssClass, callback);

    this._footerButtons.push(button);

    this.renderFooterButtons();
};

Popzy.prototype.renderFooterContent = function () {
    // hỗ trợ thay đổi footer kể cả sau khi mở - sau này nút thay đổi nội dung sẽ hiện đc
    if (this._modalFooter && this._footerContent) {
        this._modalFooter.innerHTML = this._footerContent;
    }
};

Popzy.prototype.renderFooterButtons = function () {
    // append khi đã hiện footer
    if (this._modalFooter) {
        this._footerButtons.forEach((button) => {
            this._modalFooter.append(button);
        });
    }
};

Popzy.prototype.createButton = function (title, cssClass, callback) {
    const button = document.createElement("button");
    button.innerHTML = title;
    button.className = cssClass;
    button.onclick = callback;

    return button;
};

Popzy.prototype.open = function () {
    Popzy.elements.push(this);

    if (!this._backdrop) {
        this._build();
    }
    setTimeout(() => {
        this._backdrop.classList.add("popzy--show");
    }, 0);

    // Disable scrolling
    document.body.classList.add("popzy--no-scroll");
    document.body.style.paddingRight = this._getScrollbarWidth() + "px";

    if (this._allowBackdropClose) {
        this._backdrop.onclick = (e) => {
            if (e.target === this._backdrop) {
                this.close();
                // Enable scrolling
                document.body.classList.remove("popzy--no-scroll");
            }
        };
    }

    if (this._allowEscapeClose) {
        document.addEventListener("keydown", this._handleEscapeKey);
    }

    this._onTransitionEnd(this.opt.onOpen);

    return this._backdrop;
};

Popzy.prototype._handleEscapeKey = function (e) {
    // console.log(this); //document
    
    // chỉ modal trên cùng mới đóng
    const lastPopzy = Popzy.elements[Popzy.elements.length - 1];
    if (e.key === "Escape" && this === lastPopzy) {
        this.close();
    }
};

Popzy.prototype._onTransitionEnd = function (callback) {
    this._backdrop.ontransitionend = (e) => {
        if (e.propertyName !== "transform") return;
        if (typeof callback === "function") callback();
    };
};

Popzy.prototype.close = function (destroy = this.opt.destroyOnClose) {
    Popzy.elements.pop();
    // console.log(this); //button

    this._backdrop.classList.remove("popzy--show");

    if (this._allowEscapeClose) {
        document.removeEventListener("keydown", this._handleEscapeKey);
    }

    this._onTransitionEnd(() => {
        if (this._backdrop && destroy) {
            // fix: transition gọi 3 lần nhưng khi set null sẽ văng lỗi
            this._backdrop.remove();
            this._backdrop = null;
            this._modalFooter = null;
        }
        // Enable scrolling - khi đã đóng hết modal
        if (!Popzy.elements.length) {
            document.body.classList.remove("no-scroll");
            document.body.style.paddingRight = "";
        }

        if (typeof this.opt.onClose === "function") this.opt.onClose();
    });
};

Popzy.prototype.destroy = function () {
    this.close(true);
};

Popzy.prototype._getScrollbarWidth = function () {
    // k dùng arrow function vì this sẽ trỏ về window
    if (this._getScrollbarWidth) return this._getScrollbarWidth;

    const div = document.createElement("div");
    Object.assign(div.style, {
        overflow: "scroll",
        position: "absolute",
        top: "-9999px",
    });

    document.body.appendChild(div);
    this._getScrollbarWidth = div.offsetWidth - div.clientWidth;
    document.body.removeChild(div);

    return this._getScrollbarWidth;
};