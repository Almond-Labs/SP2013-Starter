$(document).ready(function () {
    OverrideSearchBox();
});

function OverrideSearchBox() {
    jQuery('input.ms-srch-sb-prompt').blur(function () {
        jQuery("#NavDropdownListContainer").css({ display: "none", visibility: "visible" });
    });
    jQuery("input.ms-srch-sb-prompt").click(function (event) {
        var nodes = jQuery("div.ms-qSuggest-listItem");
        if (nodes.length > 0) {
            jQuery("#NavDropdownListContainer").css({ display: "block", visibility: "visible" });
            return Srch.U.cancelEvent(event.OriginalEvent);
        }
        else {
            jQuery(this).next().click();
            return Srch.U.cancelEvent(event.OriginalEvent);
        }
    });
}