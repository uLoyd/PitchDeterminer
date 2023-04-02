exports.uuidv4 = () =>
    ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
        (
            c ^
            (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
        ).toString(16)
    );

const createDomElement = (selector, classes, text) => {
    const elem = document.createElement(selector);

    if (classes) classes.forEach((cl) => elem.classList.add(cl));

    if (text != null) elem.innerText = text;

    return elem;
};

exports.createDomElement = createDomElement;

exports.getData = async (url, failedFetchAlert) => {
    const data = await fetch(url, { redirect: "error" });

    if (data.status !== 200 && failedFetchAlert) {
        alert(failedFetchAlert);
        return false;
    }

    return await data.json();
};

// valueCallback is just a function that returns what value should be assigned to each "option" element
exports.optionSelect = (selected, classes, options, valueCallback) => {
    const select = createDomElement(
        "select",
        classes instanceof Array ? classes : ["col"]
    );

    options.forEach((curOption) => {
        const option = createDomElement("option", [], curOption);
        option.value = valueCallback(curOption);

        if (curOption === selected) option.selected = true;

        select.appendChild(option);
    });

    return select;
};
