$(document).ready(function() {
    redrawscreen(60000);

    if ("Notification" in window) {
        var permission = Notification.permission;

        if (permission === "denied" || permission === "granted") {
            return;
        }
        Notification.requestPermission();
    }
});

function redrawscreen(refresh) {
    var options = {};
    options.url = 'https://localhost/zabbix/api_jsonrpc.php';
    options.username = 'guest';
    options.password = '';

    var triggers = [];
    server = new $.jqzabbix(options);

    server.userLogin(null, function() {

            var query = {
                active: 1,
                extendoutput: 1,
                lastChangeSince: 1,
                limit: 100,
                filter: {
                    value: '1'
                },
                monitored: 1,
                only_true: 1,
                expandData: 1,
                expandDescription: 1,
                expandExpression: 1,
                selectHosts: 1,
                skipDependent: 1,
                sortfield: 'priority',
                sortorder: 'DESC',
            };

            server.sendAjaxRequest('trigger.get', query, processTriggers, errorMethod);

        },
        errorMethod);


    function errorMethod() {
        $('#alertlist').replaceWith('<ul id="alertlist"></ul>');
    }

    function processTriggers(response, status) {

        var trig = [];
        for (var i = 0; i < response.result.length; i++) {
            triggers[i] = response.result[i];
            trig.push(response.result[i].triggerid);
        }

        server.sendAjaxRequest('host.get', {
            extendoutput: 1,
            triggerids: trig,
        }, getHosts, errorMethod);

    }

    function getHosts(response, status) {

        $('#alertlist').replaceWith('<ul id="alertlist"></ul>');
        var maxpriority = 0;

        triggers.forEach(function(foo) {
            var hostname = gethostname(foo.hosts[0].hostid, response.result);
            var lastchange = timeago(foo.lastchange);
            var notificationid = foo.triggerid + '_' + foo.lastchange;
            $('#alertlist').append('<li class="trigger' + foo.priority + '"><span class="time">' + lastchange + '</span><span class="hostname">' + hostname + '</span> ' + foo.description + '</li>');

            if (sessionStorage.getItem(notificationid) === null) {
                var notification = new Notification(hostname, {
                    icon: 'img/' + foo.priority + '.png',
                    body: foo.description,
                });
                notification.onclick = function() {
                    window.focus();;
                };

                setTimeout(function() {
                    notification.close();
                }, 5000);

                sessionStorage.setItem(notificationid, 1);
            }
            if (foo.priority > maxpriority) {
                maxpriority = foo.priority
            }

        })
        var title = 'ZBX';
        if (triggers.length > 0) {
            title = title + ' (' + triggers.length + ')';
        }
        document.title = title;

        document.head || (document.head = document.getElementsByTagName('head')[0]);

        changeFavicon('img/' + maxpriority + '.png');


    }

    window.setTimeout(redrawscreen, refresh, refresh);

}

function changeFavicon(src) {
    var link = document.createElement('link'),
        oldLink = document.getElementById('dynamic-favicon');
    link.id = 'dynamic-favicon';
    link.rel = 'shortcut icon';
    link.href = src;
    if (oldLink) {
        document.head.removeChild(oldLink);
    }
    document.head.appendChild(link);
}

function gethostname(hostid, hosts) {
    out = '';
    hosts.forEach(function(foo) {
        if (foo.hostid == hostid) {
            out = foo.host;
        }
    })
    return out;
}

function timeago(time) {
    var out = '';
    var now = Math.floor(Date.now() / 1000);
    var diff = now - time;

    var days = diff / (24 * 60 * 60);
    if (days > 1) {
        out = Math.floor(days) + 'd';
        diff = diff - (Math.floor(days) * 24 * 60 * 60);
    }

    var hours = diff / (60 * 60);
    if (hours > 1) {
        out = out + ' ' + Math.floor(hours) + 'h';
        diff = diff - (Math.floor(hours) * 60 * 60);
    }

    var min = diff / (60);
    if (min > 1) {
        out = out + ' ' + Math.floor(min) + 'm';
    }

    return out;
}
