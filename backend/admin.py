from django.contrib import admin

# Register your models here.


from .models import Site, Vote, VoteAdmin, Message, MessageAdmin
from leaflet.admin import LeafletGeoAdmin

admin.site.register(Site, LeafletGeoAdmin)
admin.site.register(Vote, VoteAdmin)
admin.site.register(Message, MessageAdmin)