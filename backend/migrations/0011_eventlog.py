# Generated by Django 4.2.11 on 2024-04-01 11:03

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0010_boundary'),
    ]

    operations = [
        migrations.CreateModel(
            name='EventLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(blank=True, default='', max_length=100)),
                ('ip', models.CharField(blank=True, default='', max_length=100)),
                ('content', models.TextField(blank=True)),
                ('date', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ('name', '-date'),
                'indexes': [models.Index(fields=['name'], name='backend_eve_name_78b291_idx'), models.Index(fields=['ip'], name='backend_eve_ip_1693fc_idx')],
            },
        ),
    ]
