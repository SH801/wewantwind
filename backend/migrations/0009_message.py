# Generated by Django 5.0.2 on 2024-03-12 18:56

import django.contrib.gis.db.models.fields
import django.contrib.postgres.indexes
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0008_alter_vote_options_vote_date'),
    ]

    operations = [
        migrations.CreateModel(
            name='Message',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(blank=True, default='', max_length=100)),
                ('email', models.CharField(blank=True, default='', max_length=100)),
                ('confirmed', models.BooleanField(default=False)),
                ('sent', models.BooleanField(default=False)),
                ('userlocation', django.contrib.gis.db.models.fields.PointField(blank=True, null=True, srid=4326)),
                ('ip', models.CharField(blank=True, default='', max_length=100)),
                ('token', models.CharField(blank=True, default='', max_length=100)),
                ('date', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ('name', 'email', '-date'),
                'indexes': [models.Index(fields=['name'], name='backend_mes_name_f4fde2_idx'), models.Index(fields=['email'], name='backend_mes_email_9367d0_idx'), models.Index(fields=['confirmed'], name='backend_mes_confirm_555e0f_idx'), models.Index(fields=['sent'], name='backend_mes_sent_1413de_idx'), models.Index(fields=['ip'], name='backend_mes_ip_0c4520_idx'), models.Index(fields=['token'], name='backend_mes_token_7f8b0d_idx'), django.contrib.postgres.indexes.GistIndex(fields=['userlocation'], name='backend_mes_userloc_bc4229_gist')],
            },
        ),
    ]
