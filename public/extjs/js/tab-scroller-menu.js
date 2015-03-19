Ext.Loader.setConfig({enabled: true});

Ext.Loader.setPath('Ext.ux', '../ux');

Ext.require([]);

Ext.onReady(function() {

    var currentItem;

    window.tabs = Ext.widget('tabpanel', {
        renderTo: 'tabs',
        resizeTabs: true,
        enableTabScroll: true,
        width: '100%',
        height: '100%',
        defaults: {
            autoScroll: true,
            bodyPadding: 10
        },
        items: [],
        plugins: [{
            ptype: 'tabscrollermenu',
            maxText  : 15,
            pageSize : 30
        },
        Ext.create('Ext.ux.TabCloseMenu', {
            extraItemsTail: [
                '-',
                {
                    text: 'Closable',
                    checked: true,
                    hideOnClick: true,
                    handler: function (item) {
                        currentItem.tab.setClosable(item.checked);
                    }
                },
                '-',
                {
                    text: 'Enabled',
                    checked: true,
                    hideOnClick: true,
                    handler: function(item) {
                        currentItem.tab.setDisabled(!item.checked);
                    }
                }
            ],
            listeners: {
                beforemenu: function (menu, item) {
                    var enabled = menu.child('[text="Enabled"]'); 
                    menu.child('[text="Closable"]').setChecked(item.closable);
                    if (item.tab.active) {
                        enabled.disable();
                    } else {
                        enabled.enable();
                        enabled.setChecked(!item.tab.isDisabled());
                    }

                    currentItem = item;
                }
            }
        })
        ]
    });
    
    window.index = 0;

    /*while(index < 13) {
        addTab(index % 2);
    }*/
    
    tabs.on({
        add: addToMenu,
        remove: removeFromMenu
    });

    /*Ext.widget('button', {
        iconCls: 'new-tab',
        renderTo: 'addButtonCt',
        text: 'Add Closable Tab',
        handler: function () {
            addTab(true);
        }
    });*/
    
    window.menu = new Ext.menu.Menu();
    tabs.items.each(function(tab){
        addToMenu(tabs, tab);
    });
});

function doScroll(item) {
    var id = item.id.replace('_menu', ''),
        tab = tabs.getComponent(id).tab;
   
    tabs.getTabBar().layout.overflowHandler.scrollToItem(tab);
}

function addToMenu(ct, tab) {
    menu.add({
       text: tab.title,
       id: tab.id + '_menu',
       handler: doScroll
   });
}

function removeFromMenu(ct, tab) {
    var id = tab.id + '_menu';
    menu.remove(id);
}

function addTab(title,html,closable,iconCls) {
    var exiTab = false;
    var title = title || null;
    if(title === null) return;
    var html = html || '<ul class="list-unstyled"></ul>';
    var iconCls = iconCls || 'tabs';
    if(tabs.items.length > 0){
        for (var i = 0; i < tabs.items.length; i++) {
            if(tabs.getComponent(i).title == title){
                exiTab = true;
                exiTabId = i;
                break;
            }
        }
        if(!exiTab){
            tabs.add({
                closable: !!closable,
                html: html,
                iconCls: iconCls,
                title: title
            }).show();
        }else{
            tabs.getComponent(exiTabId).show();
        }
    }else{
        tabs.add({
            closable: !!closable,
            html: html,
            iconCls: iconCls,
            title: title
        }).show();
    }
}