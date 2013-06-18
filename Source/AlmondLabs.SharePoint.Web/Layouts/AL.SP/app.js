//Handlers
ko.bindingHandlers.starRating = {
    init: function (element, valueAccessor) {
        $(element).addClass("doc-rating");
        for (var i = 0; i < 5; i++)
            $("<span>").appendTo(element);

        $("span", element).each(function (index) {
            $(this).hover(
                function () {
                    $(this).prevAll().add(this).addClass("hoverChosen");
                    $(this).nextAll().addClass("hoverCleared");
                },
                function () {
                    $(this).prevAll().add(this).removeClass("hoverChosen");
                    $(this).nextAll().removeClass("hoverCleared");
                }
            ).click(function () {
                var observable = valueAccessor();
                observable(index + 1);
            });
        });
    },
    update: function (element, valueAccessor) {
        var observable = valueAccessor();
        var decRating = observable() - Math.floor(observable());
        var stars = observable() - decRating;
        $("span", element).each(function (index) {
            if (index < stars) {
                $(this).toggleClass("chosen", true);
            } else if (decRating > 0) {
                $(this).toggleClass("halfChosen", decRating >= 0.25 && decRating <= 0.75);
                $(this).toggleClass("chosen", decRating > 0.75);
                decRating = 0;
            } else
                $(this).toggleClass("chosen", false);
        });
    }
};

//ViewModels
function SearchRatingViewModel(avgRating, siteUrl, listId, listItemId) {
    var vm = this;
    vm.rating = ko.observable(avgRating);
    vm.site = siteUrl;
    vm.listId = listId;
    vm.itemId = listItemId;
    vm.rating.subscribe(function () {
        loadSPData('reputation.js', function () {
            vm.updateRating();
        });
    });

    vm.updateRating = function () {
        var spCtx = new SP.ClientContext(vm.site);
        Microsoft.Office.Server.ReputationModel.Reputation.setRating(spCtx, vm.listId, vm.itemId, vm.rating());
        spCtx.executeQueryAsync(
            function () {
                SP.UI.Notify.addNotification("Thank you for rating this document", false);
            },
            function () {
                SP.UI.Notify.addNotification("There was an error saving your rating", false);
            });

    };
}

//Functions
function loadSPData(script, scriptFunction) {
    SP.SOD.executeOrDelayUntilScriptLoaded(Function.createDelegate(this, function () {
        var taxonomySodLoaded = false;
        if (typeof (_v_dictSod) !== 'undefined' && _v_dictSod[script] == null) {
            SP.SOD.registerSod(script, SP.Utilities.Utility.getLayoutsPageUrl(script));
        }
        else {
            taxonomySodLoaded = _v_dictSod[script].state === Sods.loaded;
        }
        if (taxonomySodLoaded) {
            Function.createDelegate(this, scriptFunction)();
        }
        else {
            SP.SOD.executeFunc(script, false, Function.createDelegate(this, scriptFunction));
        }
    }), 'core.js');
}

function parseDate(jsonDate) {
    var d = new Date(parseInt(jsonDate.substr(6)));
    return d.getMonth() + "/" + d.getDate() + "/" + d.getFullYear();
}

function getParameterByName(name, url) {
    if (!url)
        url = window.location.href;

    var match = RegExp('[?&]' + name + '=([^&#]*)').exec(url);
    return match && match[1].replace(/\+/g, ' ');
}

function SPSODAction(sodScripts, onLoadAction) {
    if (SP.SOD.loadMultiple)
        SP.SOD.loadMultiple(sodScripts, function () {
            ExecuteOrDelayUntilScriptLoaded(onLoadAction, sodScripts[0]);
        });
    else
        ExecuteOrDelayUntilScriptLoaded(onLoadAction, sodScripts[0]);
}
