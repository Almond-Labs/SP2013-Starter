$(document).ready(function () {
    OverrideSearchBox();
});

function OverrideSearchBox() {
    $('input.ms-srch-sb-prompt').blur(function () {
        $("#NavDropdownListContainer").css({ display: "none", visibility: "visible" });
    });
    $("input.ms-srch-sb-prompt").click(function (event) {
        var nodes = $("div.ms-qSuggest-listItem");
        if (nodes.length > 0) {
            $addHandler("#NavDropdownListContainer").css({ display: "block", visibility: "visible" });
            return Srch.U.cancelEvent(event.OriginalEvent);
        }
        else {
            $(this).next().click();
        }
    });
}