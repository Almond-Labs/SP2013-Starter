$j(document).ready(function () {
    OverrideSearchBox();
});

function OverrideSearchBox() {
    $j("input.ms-srch-sb-prompt").click(function (event) {
        var nodes = $j("div.ms-qSuggest-listItem");
        if (nodes.length > 0) {
            $j("#NavDropdownListContainer").css({ display: "block", visibility: "visible" });
        }
        else {
            $j(this).next().click();
        }
        return Srch.U.cancelEvent(event.OriginalEvent);
    });
    $j('input.ms-srch-sb-prompt').blur(function () {
        $j("#NavDropdownListContainer").css({ display: "none", visibility: "visible" });
    });
}